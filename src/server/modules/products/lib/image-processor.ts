import sharp from 'sharp';

/**
 * Processa a imagem redimensionando (padrão 800x800, ou customizado ex: 1200x400 p/ banner)
 * e convertendo para WebP de alta performance.
 * Aceita tanto Buffer em memória quanto caminho do arquivo em disco (filePath).
 */
export async function processImage(
    input: Buffer | string,
    options?: { width?: number; height?: number }
) {
    const width = options?.width ?? 800;
    const height = options?.height ?? 800;

    try {
        const { data, info } = await sharp(input)
            .resize({
                width,
                height,
                fit: 'cover',
                position: 'center',
            })
            .webp({ quality: 80, effort: 4 })
            .toBuffer({ resolveWithObject: true });

        return { buffer: data, metadata: info };
    } catch (e) {
        console.error("Não foi possível processar a imagem: ", e);
        return { success: false, error: e };
    }
}