import sharp from 'sharp';

/**
 * Processa a imagem redimensionando para 800x800 e convertendo para WebP de alta performance.
 * Aceita tanto Buffer em memória quanto caminho do arquivo em disco (filePath).
 */
export async function processImage(input: Buffer | string) {
    try {
        const { data, info } = await sharp(input)
            .resize({
                width: 800,
                height: 800,
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