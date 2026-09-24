// Retry a failed transfer, not a successfully decoded but invalid asset.
// A shared helper lets each independent arena resource recover from a CDN drop.
export async function loadGltfWithRetry(loader, url, onProgress) {
  let failure;
  for (let attempt = 0; attempt < 3; attempt++) {
    try { return await loader.loadAsync(url, onProgress); }
    catch (error) {
      failure = error;
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
  throw new Error(`模型资源下载失败，请重新加载：${url.split('/').pop()}`, { cause: failure });
}
