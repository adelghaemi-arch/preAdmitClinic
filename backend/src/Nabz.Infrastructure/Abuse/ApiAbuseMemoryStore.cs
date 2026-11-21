/*
 File: backend/src/Nabz.Infrastructure/Abuse/ApiAbuseMemoryStore.cs
 Description: شمارنده پنجرهٔ لغزان و deny-set در حافظهٔ فرایند (UC-PLT-17)
 Parent Dependencies: IApiAbuseMemoryStore
 */

using System.Collections.Concurrent;
using Nabz.Application.Abstractions;

namespace Nabz.Infrastructure.Abuse;

public sealed class ApiAbuseMemoryStore : IApiAbuseMemoryStore
{
    private readonly ConcurrentDictionary<string, DateTime> _deniedUntil = new(StringComparer.Ordinal);
    private readonly ConcurrentDictionary<string, DateTime> _platformUntil = new(StringComparer.Ordinal);
    private readonly ConcurrentDictionary<string, DateTime> _lastSeenWriteUtc = new(StringComparer.Ordinal);
    private readonly ConcurrentDictionary<string, WindowCounter> _counters = new(StringComparer.Ordinal);
    private readonly ConcurrentDictionary<string, DateTime> _cooldownUntil = new(StringComparer.Ordinal);

    public bool IsTokenDenied(string tokenHash)
    {
        if (string.IsNullOrWhiteSpace(tokenHash)) return false;
        if (!_deniedUntil.TryGetValue(tokenHash, out var until)) return false;
        if (until > DateTime.UtcNow) return true;
        _deniedUntil.TryRemove(tokenHash, out _);
        return false;
    }

    public void DenyTokenHashes(IEnumerable<string> tokenHashes, TimeSpan ttl)
    {
        var until = DateTime.UtcNow.Add(ttl);
        foreach (var h in tokenHashes)
        {
            if (string.IsNullOrWhiteSpace(h)) continue;
            _deniedUntil[h] = until;
        }
    }

    public void RememberPlatformToken(string tokenHash, TimeSpan ttl)
    {
        if (string.IsNullOrWhiteSpace(tokenHash)) return;
        _platformUntil[tokenHash] = DateTime.UtcNow.Add(ttl);
    }

    public bool IsPlatformToken(string tokenHash)
    {
        if (string.IsNullOrWhiteSpace(tokenHash)) return false;
        if (!_platformUntil.TryGetValue(tokenHash, out var until)) return false;
        if (until > DateTime.UtcNow) return true;
        _platformUntil.TryRemove(tokenHash, out _);
        return false;
    }

    public bool ShouldSkipLastSeenWrite(string tokenHash, int minIntervalSeconds)
    {
        if (string.IsNullOrWhiteSpace(tokenHash) || minIntervalSeconds <= 0) return false;
        var now = DateTime.UtcNow;
        if (_lastSeenWriteUtc.TryGetValue(tokenHash, out var last) && (now - last).TotalSeconds < minIntervalSeconds)
            return true;
        _lastSeenWriteUtc[tokenHash] = now;
        return false;
    }

    public ApiAbuseHitResult Hit(string counterKey, string fingerprint, int softWindowSeconds, int hardWindowSeconds)
    {
        var counter = _counters.GetOrAdd(counterKey, _ => new WindowCounter());
        return counter.Hit(fingerprint, softWindowSeconds, hardWindowSeconds);
    }

    public bool TryBeginIncidentCooldown(string cooldownKey, TimeSpan cooldown)
    {
        var now = DateTime.UtcNow;
        if (_cooldownUntil.TryGetValue(cooldownKey, out var until) && until > now)
            return false;
        _cooldownUntil[cooldownKey] = now.Add(cooldown);
        return true;
    }

    private sealed class WindowCounter
    {
        private readonly object _gate = new();
        private readonly Queue<(DateTime At, string Fp)> _events = new();

        public ApiAbuseHitResult Hit(string fingerprint, int softWindowSeconds, int hardWindowSeconds)
        {
            lock (_gate)
            {
                var now = DateTime.UtcNow;
                _events.Enqueue((now, fingerprint));
                var softCut = now.AddSeconds(-Math.Max(1, softWindowSeconds));
                var hardCut = now.AddSeconds(-Math.Max(1, hardWindowSeconds));
                while (_events.Count > 0 && _events.Peek().At < hardCut)
                    _events.Dequeue();

                var softSame = 0;
                var softTotal = 0;
                var hardSame = 0;
                var hardTotal = 0;
                var dominant = fingerprint;
                var hardFpCounts = new Dictionary<string, int>(StringComparer.Ordinal);

                foreach (var e in _events)
                {
                    hardTotal++;
                    hardFpCounts[e.Fp] = hardFpCounts.TryGetValue(e.Fp, out var c) ? c + 1 : 1;
                    if (string.Equals(e.Fp, fingerprint, StringComparison.Ordinal))
                        hardSame++;
                    if (e.At >= softCut)
                    {
                        softTotal++;
                        if (string.Equals(e.Fp, fingerprint, StringComparison.Ordinal))
                            softSame++;
                    }
                }

                var max = 0;
                foreach (var kv in hardFpCounts)
                {
                    if (kv.Value > max)
                    {
                        max = kv.Value;
                        dominant = kv.Key;
                    }
                }

                return new ApiAbuseHitResult(softSame, softTotal, hardSame, hardTotal, dominant);
            }
        }
    }
}
