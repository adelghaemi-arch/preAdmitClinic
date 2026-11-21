/*
 File: backend/src/Nabz.Application/Security/TokenHashing.cs
 Description: هش SHA-256 توکن opaque برای deny-set و lookup نشست
 Parent Dependencies: none
 */

using System.Security.Cryptography;
using System.Text;

namespace Nabz.Application.Security;

public static class TokenHashing
{
    public static string Sha256Hex(string value)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(value));
        // همان قالب قبلی AuthService (hex بزرگ) تا نشست‌های موجود نشکنند
        return Convert.ToHexString(bytes);
    }
}
