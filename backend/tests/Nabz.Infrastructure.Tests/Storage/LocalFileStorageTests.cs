/*
 File: backend/tests/Nabz.Infrastructure.Tests/Storage/LocalFileStorageTests.cs
 Description: مسیر yyyy/NNN و حذف امن کلید نسبی برای خزانه فایل
 Parent Dependencies: LocalFileStorage, Microsoft.Extensions.Configuration
 */

using Microsoft.Extensions.Configuration;
using Nabz.Application.Abstractions;
using Nabz.Infrastructure.Storage;

namespace Nabz.Infrastructure.Tests.Storage;

public sealed class LocalFileStorageTests
{
    [Theory]
    [InlineData("0012345679", "001")]
    [InlineData("1904636919", "190")]
    [InlineData(null, "000")]
    [InlineData("", "000")]
    [InlineData("12", "000")]
    [InlineData("ab12cd345", "123")]
    public void NormalizeNationalIdPrefix_UsesFirstThreeDigitsOr000(string? nationalId, string expected)
    {
        Assert.Equal(expected, LocalFileStorage.NormalizeNationalIdPrefix(nationalId));
    }

    [Fact]
    public async Task SaveAsync_BuildsYearAndNationalIdPrefixKey()
    {
        var root = Path.Combine(Path.GetTempPath(), "nabz-storage-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(root);
        try
        {
            var config = new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Storage:Root"] = root
                })
                .Build();
            var storage = new LocalFileStorage(config);
            await using var stream = new MemoryStream(new byte[] { 1, 2, 3 });

            var saved = await storage.SaveAsync(
                stream,
                "portrait.jpg",
                "image/jpeg",
                new StorageSaveContext("0012345679"));

            var year = DateTime.UtcNow.ToString("yyyy");
            Assert.StartsWith($"{year}/001/", saved.StorageKey);
            Assert.True(File.Exists(Path.Combine(root, saved.StorageKey.Replace('/', Path.DirectorySeparatorChar))));
        }
        finally
        {
            if (Directory.Exists(root))
                Directory.Delete(root, recursive: true);
        }
    }

    [Fact]
    public async Task DeleteAsync_RemovesBlob_AndRejectsPathTraversal()
    {
        var root = Path.Combine(Path.GetTempPath(), "nabz-storage-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(root);
        try
        {
            var config = new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Storage:Root"] = root
                })
                .Build();
            var storage = new LocalFileStorage(config);
            await using var stream = new MemoryStream(new byte[] { 9 });
            var saved = await storage.SaveAsync(stream, "a.bin", "application/octet-stream", new StorageSaveContext("190"));

            Assert.True(await storage.DeleteAsync(saved.StorageKey));
            Assert.False(await storage.DeleteAsync(saved.StorageKey));
            Assert.False(await storage.DeleteAsync("../outside.bin"));
        }
        finally
        {
            if (Directory.Exists(root))
                Directory.Delete(root, recursive: true);
        }
    }
}
