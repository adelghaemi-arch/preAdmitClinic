/*
 File: backend/tests/Nabz.Infrastructure.Tests/Security/FraudFrameWireCodecTests.cs
 Description: Unit پوشش NBZ1 فریم ضدتقلب — UC-OWN-09
 Parent Dependencies: FraudFrameWireCodec
 */

using Nabz.Application.Security;

namespace Nabz.Infrastructure.Tests.Security;

public sealed class FraudFrameWireCodecTests
{
    private static readonly byte[] TinyJpeg =
    [
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
        0x00, 0x01, 0x00, 0x00, 0xFF, 0xD9
    ];

    [Fact]
    [Trait("UC", "UC-OWN-09")]
    public void WrapUnwrap_RoundTripsJpeg()
    {
        var key = FraudFrameWireCodec.CreateWrapKey();
        var envelope = FraudFrameWireCodec.Wrap(TinyJpeg, key);
        Assert.True(FraudFrameWireCodec.IsEnvelope(envelope));
        Assert.False(FraudFrameWireCodec.IsJpeg(envelope));
        var plain = FraudFrameWireCodec.Unwrap(envelope, key);
        Assert.Equal(TinyJpeg, plain);
    }

    [Fact]
    [Trait("UC", "UC-OWN-09")]
    public void Unwrap_WrongKey_Throws()
    {
        var envelope = FraudFrameWireCodec.Wrap(TinyJpeg, FraudFrameWireCodec.CreateWrapKey());
        Assert.Throws<InvalidOperationException>(() =>
            FraudFrameWireCodec.Unwrap(envelope, FraudFrameWireCodec.CreateWrapKey()));
    }

    [Fact]
    [Trait("UC", "UC-OWN-09")]
    public void Wrap_NonJpeg_Throws()
    {
        Assert.Throws<InvalidOperationException>(() =>
            FraudFrameWireCodec.Wrap([0x00, 0x01, 0x02], FraudFrameWireCodec.CreateWrapKey()));
    }
}
