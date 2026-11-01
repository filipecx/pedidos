"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";

interface ImageCropModalProps {
  imageFile: File;
  onCropComplete: (croppedBlob: Blob) => void;
  onCancel: () => void;
  aspectRatio?: number; // Largura / Altura (ex: 1 para quadrado 1:1, 3 para banner 3:1)
  title?: string;
  subtitle?: string;
}

export function ImageCropModal({
  imageFile,
  onCropComplete,
  onCancel,
  aspectRatio = 1,
  title = "Ajustar Foto do Produto",
  subtitle = "Arraste e ajuste o zoom para o enquadramento perfeito (1:1).",
}: ImageCropModalProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [cropBoxSize, setCropBoxSize] = useState<{ width: number; height: number }>({
    width: aspectRatio === 1 ? 256 : 288,
    height: aspectRatio === 1 ? 256 : Math.round(288 / aspectRatio),
  });
  
  // Crop transforms: offset X and Y (in px of viewport) and zoom scale
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const measureContainer = useCallback(() => {
    if (!containerRef.current) return;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    if (width > 0 && height > 0) {
      setCropBoxSize({ width, height });
    }
  }, []);

  // Carrega a imagem a partir do arquivo
  useEffect(() => {
    const url = URL.createObjectURL(imageFile);
    setImageSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  useEffect(() => {
    measureContainer();
    window.addEventListener("resize", measureContainer);
    return () => window.removeEventListener("resize", measureContainer);
  }, [measureContainer]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    measureContainer();
    setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  // Garante que a imagem nunca seja arrastada para fora da área de recorte (evita bordas pretas)
  const clampOffset = useCallback(
    (nextOffset: { x: number; y: number }, targetZoom: number) => {
      if (!containerRef.current || !naturalSize) return nextOffset;

      const cropBoxWidth = containerRef.current.clientWidth;
      const cropBoxHeight = containerRef.current.clientHeight;
      if (cropBoxWidth <= 0 || cropBoxHeight <= 0) return nextOffset;

      const baseScale = Math.max(
        cropBoxWidth / naturalSize.width,
        cropBoxHeight / naturalSize.height
      );

      const scaledWidth = naturalSize.width * baseScale * targetZoom;
      const scaledHeight = naturalSize.height * baseScale * targetZoom;

      const maxOffsetX = Math.max(0, (scaledWidth - cropBoxWidth) / 2);
      const maxOffsetY = Math.max(0, (scaledHeight - cropBoxHeight) / 2);

      return {
        x: Math.min(maxOffsetX, Math.max(-maxOffsetX, nextOffset.x)),
        y: Math.min(maxOffsetY, Math.max(-maxOffsetY, nextOffset.y)),
      };
    },
    [naturalSize]
  );

  // Drag handlers (Mouse & Touch)
  const handlePointerDown = (clientX: number, clientY: number) => {
    setIsDragging(true);
    setDragStart({ x: clientX - offset.x, y: clientY - offset.y });
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    setOffset(
      clampOffset(
        {
          x: clientX - dragStart.x,
          y: clientY - dragStart.y,
        },
        zoom
      )
    );
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const handleZoomChange = (nextZoom: number) => {
    setZoom(nextZoom);
    setOffset((prev) => clampOffset(prev, nextZoom));
  };

  // Gera o corte de alta resolução usando Canvas respeitando aspectRatio
  const handleConfirmCrop = useCallback(() => {
    if (!imgRef.current || !containerRef.current || !naturalSize) return;

    const img = imgRef.current;
    const container = containerRef.current;
    const cropBoxWidth = container.clientWidth;
    const cropBoxHeight = container.clientHeight;
    if (cropBoxWidth <= 0 || cropBoxHeight <= 0) return;

    // Dimensão final desejada (ex: 1200x1200 p/ 1:1 ou 1200x400 p/ banner 3:1)
    const maxOutputWidth = 1200;
    const outputWidth = Math.min(maxOutputWidth, naturalSize.width);
    const outputHeight = Math.round(outputWidth / aspectRatio);

    const canvas = document.createElement("canvas");
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    // Escala base em que a foto preenche a caixa de corte sem sobrar bordas (zoom = 1)
    const baseScale = Math.max(
      cropBoxWidth / naturalSize.width,
      cropBoxHeight / naturalSize.height
    );

    // Escala efetiva considerando o zoom aplicado via CSS transform
    const effectiveScale = baseScale * zoom;

    // Tamanho do recorte em pixels da imagem original (natural)
    const sourceWidth = cropBoxWidth / effectiveScale;
    const sourceHeight = cropBoxHeight / effectiveScale;

    // Coordenadas na imagem original com trava de segurança contra arredondamento de ponto flutuante
    const clampedOffset = clampOffset(offset, zoom);
    const maxSourceX = Math.max(0, naturalSize.width - sourceWidth);
    const maxSourceY = Math.max(0, naturalSize.height - sourceHeight);

    const rawSourceX = (naturalSize.width - sourceWidth) / 2 - clampedOffset.x / effectiveScale;
    const rawSourceY = (naturalSize.height - sourceHeight) / 2 - clampedOffset.y / effectiveScale;

    const sourceX = Math.min(maxSourceX, Math.max(0, rawSourceX));
    const sourceY = Math.min(maxSourceY, Math.max(0, rawSourceY));

    // Desenha no canvas
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    ctx.drawImage(
      img,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      outputWidth,
      outputHeight
    );

    canvas.toBlob(
      (blob) => {
        if (blob) {
          onCropComplete(blob);
        }
      },
      imageFile.type === "image/png" ? "image/png" : "image/jpeg",
      0.92
    );
  }, [offset, zoom, naturalSize, imageFile, onCropComplete, clampOffset, aspectRatio]);

  const baseScale =
    naturalSize && cropBoxSize.width > 0 && cropBoxSize.height > 0
      ? Math.max(
          cropBoxSize.width / naturalSize.width,
          cropBoxSize.height / naturalSize.height
        )
      : 1;

  const renderedWidth = naturalSize ? Math.ceil(naturalSize.width * baseScale) : undefined;
  const renderedHeight = naturalSize ? Math.ceil(naturalSize.height * baseScale) : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col border border-gray-100 dark:border-gray-800">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-base">
              {title}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {subtitle}
            </p>
          </div>
          <button
            onClick={onCancel}
            type="button"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
          >
            ✕
          </button>
        </div>

        {/* Viewport / Crop Area */}
        <div className="relative bg-gray-950 flex items-center justify-center p-4 select-none touch-none overflow-hidden">
          {/* Container do Recorte */}
          <div
            ref={containerRef}
            className={`relative rounded-2xl overflow-hidden shadow-inner border-2 border-dashed border-white/60 flex items-center justify-center cursor-grab active:cursor-grabbing ${
              aspectRatio === 1
                ? "w-64 h-64 sm:w-72 sm:h-72"
                : "w-72 h-24 sm:w-84 sm:h-28"
            }`}
            onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
            onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={(e) => {
              if (e.touches.length === 1) {
                handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
              }
            }}
            onTouchMove={(e) => {
              if (e.touches.length === 1) {
                handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
              }
            }}
            onTouchEnd={handlePointerUp}
          >
            {imageSrc && (
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Enquadramento"
                onLoad={handleImageLoad}
                style={{
                  transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                  transformOrigin: "center center",
                  maxHeight: "none",
                  maxWidth: "none",
                  width: renderedWidth ? `${renderedWidth}px` : "100%",
                  height: renderedHeight ? `${renderedHeight}px` : "100%",
                }}
                className="pointer-events-none select-none shrink-0 transition-transform duration-75"
                draggable={false}
              />
            )}

            {/* Grid guia (regra dos terços) */}
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-30">
              <div className="border-r border-b border-white" />
              <div className="border-r border-b border-white" />
              <div className="border-b border-white" />
              <div className="border-r border-b border-white" />
              <div className="border-r border-b border-white" />
              <div className="border-b border-white" />
              <div className="border-r border-white" />
              <div className="border-r border-white" />
              <div />
            </div>
          </div>
        </div>

        {/* Controles de Zoom */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800/40 border-t border-gray-100 dark:border-gray-800 space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 font-medium">Zoom</span>
            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
              className="flex-1 accent-[var(--color-primary)] cursor-pointer h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none"
            />
            <span className="text-xs font-mono text-gray-600 dark:text-gray-300 w-8 text-right">
              {zoom.toFixed(1)}x
            </span>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Dica: Fotos do Instagram ou Stories podem ser reposicionadas livremente.</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-2 bg-white dark:bg-gray-900">
          <Button variant="outline" type="button" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirmCrop}
            className="bg-[var(--color-primary)] text-white hover:opacity-90"
          >
            Confirmar Enquadramento
          </Button>
        </div>
      </div>
    </div>
  );
}
