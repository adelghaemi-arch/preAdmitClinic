/*
 File: backend/src/Nabz.Application/Security/FraudFrameWireCodec.cs
 Description: پوشش باینری فریم ضدتقلب روی سیم (NBZ1 + nonce + XOR) و تشخیص JPEG
 Parent Dependencies: none
 */

using System.Security.Cryptography;
using System.Text;

namespace Nabz.Application.Security;

/// <summary>
/// Envelope روی سیم: <c>NBZ1</c> (4) + nonce (16) + XOR(JPEG, keystream(wrapKey, nonce)).
/// روی دیسک همیشه JPEG خام نگه داشته می‌شود.
/// </summary>
public static class FraudFrameWireCodec
{
    public const string MagicAscii = "NBZ1";
    public const int NonceLength = 16;
    private static readonly byte[] MagicBytes = Encoding.ASCII.GetBytes(MagicAscii);

    public static bool IsEnvelope(ReadOnlySpan<byte> data)
        => data.Length >= MagicBytes.Length + NonceLength + 3
           && data[..MagicBytes.Length].SequenceEqual(MagicBytes);

    public static bool IsJpeg(ReadOnlySpan<byte> data)
        => data.Length >= 3 && data[0] == 0xFF && data[1] == 0xD8 && data[2] == 0xFF;

    /// <summary>کلید نشست به‌صورت Base64Url بدون پدینگ (۳۲ بایت تصادفی).</summary>
    public static string CreateWrapKey()
    {
        Span<byte> key = stackalloc byte[32];
        RandomNumberGenerator.Fill(key);
        return Base64UrlEncode(key);
    }

    public static byte[] Wrap(ReadOnlySpan<byte> jpegPlain, string wrapKeyBase64Url)
    {
        if (!IsJpeg(jpegPlain))
            throw new InvalidOperationException("بدنه باید JPEG معتبر باشد.");
        var key = DecodeWrapKey(wrapKeyBase64Url);
        Span<byte> nonce = stackalloc byte[NonceLength];
        RandomNumberGenerator.Fill(nonce);
        var body = XorWithKeystream(jpegPlain, key, nonce);
        var result = new byte[MagicBytes.Length + NonceLength + body.Length];
        MagicBytes.CopyTo(result.AsSpan(0, MagicBytes.Length));
        nonce.CopyTo(result.AsSpan(MagicBytes.Length, NonceLength));
        body.CopyTo(result.AsSpan(MagicBytes.Length + NonceLength));
        return result;
    }

    public static byte[] Unwrap(ReadOnlySpan<byte> envelope, string wrapKeyBase64Url)
    {
        if (!IsEnvelope(envelope))
            throw new InvalidOperationException("پوشش فریم ضدتقلب نامعتبر است.");
        var key = DecodeWrapKey(wrapKeyBase64Url);
        var nonce = envelope.Slice(MagicBytes.Length, NonceLength);
        var cipher = envelope[(MagicBytes.Length + NonceLength)..];
        var plain = XorWithKeystream(cipher, key, nonce);
        if (!IsJpeg(plain))
            throw new InvalidOperationException("پس از رمزگشایی، فایل JPEG نیست.");
        return plain;
    }

    private static byte[] DecodeWrapKey(string wrapKeyBase64Url)
    {
        if (string.IsNullOrWhiteSpace(wrapKeyBase64Url))
            throw new InvalidOperationException("کلید پوشش نشست خالی است.");
        try
        {
            var key = Base64UrlDecode(wrapKeyBase64Url.Trim());
            if (key.Length is < 16 or > 64)
                throw new InvalidOperationException("طول کلید پوشش نامعتبر است.");
            return key;
        }
        catch (FormatException)
        {
            throw new InvalidOperationException("فرمت کلید پوشش نامعتبر است.");
        }
    }

    private static byte[] XorWithKeystream(ReadOnlySpan<byte> data, ReadOnlySpan<byte> key, ReadOnlySpan<byte> nonce)
    {
        // keystream = SHA256(key || nonce || counter) تکرارشونده — بدون وابستگی به AES در FE
        var output = new byte[data.Length];
        var block = new byte[32];
        var counter = 0;
        var offset = 0;
        while (offset < data.Length)
        {
            FillBlock(key, nonce, counter++, block);
            var n = Math.Min(32, data.Length - offset);
            for (var i = 0; i < n; i++)
                output[offset + i] = (byte)(data[offset + i] ^ block[i]);
            offset += n;
        }
        return output;
    }

    private static void FillBlock(ReadOnlySpan<byte> key, ReadOnlySpan<byte> nonce, int counter, Span<byte> dest32)
    {
        Span<byte> material = stackalloc byte[key.Length + nonce.Length + 4];
        key.CopyTo(material);
        nonce.CopyTo(material[key.Length..]);
        BitConverter.TryWriteBytes(material[(key.Length + nonce.Length)..], counter);
        SHA256.HashData(material, dest32);
    }

    private static string Base64UrlEncode(ReadOnlySpan<byte> data)
        => Convert.ToBase64String(data).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static byte[] Base64UrlDecode(string input)
    {
        var s = input.Replace('-', '+').Replace('_', '/');
        switch (s.Length % 4)
        {
            case 2: s += "=="; break;
            case 3: s += "="; break;
        }
        return Convert.FromBase64String(s);
    }
}
