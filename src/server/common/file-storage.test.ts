import { describe, it, expect, afterEach } from "vitest";
import {
  streamFileToDisk,
  cleanupTempFile,
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_FILE_SIZE,
} from "./file-storage";
import { promises as fs } from "fs";

describe("File Storage Streaming Utility", () => {
  const createdFiles: string[] = [];

  afterEach(async () => {
    for (const file of createdFiles) {
      await cleanupTempFile(file);
    }
    createdFiles.length = 0;
  });

  it("deve salvar arquivo válido em streaming no disco temporário", async () => {
    const content = Buffer.from("fake-image-content-for-testing");
    const file = new File([content], "test.jpg", { type: "image/jpeg" });

    const result = await streamFileToDisk(file, "test-product");
    createdFiles.push(result.filePath);

    expect(result.filePath).toBeDefined();
    expect(result.sizeBytes).toBe(content.length);

    const exists = await fs
      .stat(result.filePath)
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(true);

    const savedContent = await fs.readFile(result.filePath);
    expect(savedContent.toString()).toBe("fake-image-content-for-testing");
  });

  it("deve rejeitar arquivo com tipo MIME não suportado", async () => {
    const file = new File(["fake-pdf"], "document.pdf", { type: "application/pdf" });

    await expect(streamFileToDisk(file, "test")).rejects.toThrow(
      /Tipo de arquivo não suportado/
    );
  });

  it("deve rejeitar arquivo maior que 10MB antes do streaming", async () => {
    // Simula arquivo grande sem alocar 11MB reais em buffer se possível
    const oversizedBlob = new Blob([new Uint8Array(11 * 1024 * 1024)], {
      type: "image/jpeg",
    });
    const file = new File([oversizedBlob], "huge.jpg", { type: "image/jpeg" });

    await expect(streamFileToDisk(file, "test-huge")).rejects.toThrow(
      /Arquivo excede o limite máximo permitido de 10MB/
    );
  });

  it("deve remover arquivo temporário com cleanupTempFile", async () => {
    const file = new File(["dummy"], "dummy.webp", { type: "image/webp" });
    const { filePath } = await streamFileToDisk(file, "cleanup-test");

    let exists = await fs
      .stat(filePath)
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(true);

    await cleanupTempFile(filePath);

    exists = await fs
      .stat(filePath)
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(false);
  });
});
