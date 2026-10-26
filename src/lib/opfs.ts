const ROOT_DIR = 'jxl-outputs';

async function getRoot(): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle(ROOT_DIR, { create: true });
}

export async function writeOpfsBuffer(jobId: string, buffer: ArrayBuffer): Promise<string> {
  const dir = await getRoot();
  const fileName = `${jobId}.jxl`;
  const handle = await dir.getFileHandle(fileName, { create: true });
  const writable = await handle.createWritable();
  await writable.write(buffer);
  await writable.close();
  return `${ROOT_DIR}/${fileName}`;
}

export async function readOpfsBuffer(jobId: string): Promise<ArrayBuffer> {
  const dir = await getRoot();
  const handle = await dir.getFileHandle(`${jobId}.jxl`);
  const file = await handle.getFile();
  return file.arrayBuffer();
}

export async function deleteOpfsFile(jobId: string): Promise<void> {
  try {
    const dir = await getRoot();
    await dir.removeEntry(`${jobId}.jxl`);
  } catch {
    // ignore missing files
  }
}

export async function clearOpfsOutputs(): Promise<void> {
  try {
    const root = await navigator.storage.getDirectory();
    await root.removeEntry(ROOT_DIR, { recursive: true });
  } catch {
    // ignore
  }
}
