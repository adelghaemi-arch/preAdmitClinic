/*
 File: backend/src/Nabz.Application/Time/IranDateTimeJsonConverter.cs
 Description: سریالایز DateTime به وقت ایران (+03:30)؛ deserialize به UTC
 Parent Dependencies: IranTime
 */

using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Nabz.Application.Time;

/// <summary>
/// خروجی JSON دیوارساعت ایران با آفست؛ ورودی با آفست/Z به UTC.
/// DateOnly و رشته‌های civil جدا هستند و از این converter رد نمی‌شوند.
/// </summary>
public sealed class IranDateTimeJsonConverter : JsonConverter<DateTime>
{
    public override DateTime Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType != JsonTokenType.String)
            throw new JsonException("تاریخ باید رشته باشد.");
        var s = reader.GetString();
        if (string.IsNullOrWhiteSpace(s))
            throw new JsonException("تاریخ خالی است.");
        if (DateTimeOffset.TryParse(s, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var dto))
            return dto.UtcDateTime;
        if (DateTime.TryParse(s, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var dt))
            return IranTime.EnsureUtc(dt);
        throw new JsonException("فرمت تاریخ نامعتبر است.");
    }

    public override void Write(Utf8JsonWriter writer, DateTime value, JsonSerializerOptions options)
    {
        var offset = IranTime.ToIranOffset(value);
        writer.WriteStringValue(offset.ToString("yyyy-MM-dd'T'HH:mm:sszzz", CultureInfo.InvariantCulture));
    }
}

public sealed class IranNullableDateTimeJsonConverter : JsonConverter<DateTime?>
{
    private static readonly IranDateTimeJsonConverter Inner = new();

    public override DateTime? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.Null)
            return null;
        return Inner.Read(ref reader, typeof(DateTime), options);
    }

    public override void Write(Utf8JsonWriter writer, DateTime? value, JsonSerializerOptions options)
    {
        if (value is null)
        {
            writer.WriteNullValue();
            return;
        }
        Inner.Write(writer, value.Value, options);
    }
}
