import Cropper from "cropperjs";

export function saveOriginal(
    originalImageBase64: string | null,
    setCroppedImage: (value: string | null) => void,
    createRecord: () => void
): void {
    if (!originalImageBase64)
        return;

    setCroppedImage(originalImageBase64);
    createRecord();
}

export function cropImage(
    cropper: Cropper | null,
    setCropped: (val: string | null) => void,
    createRecord: () => void,
    imageType?: string
): void {
    if (!cropper) 
        return;

    const canvas = cropper.getCroppedCanvas({
        width: 800,
        height: 400
    });    

    const base64 = canvas.toDataURL(`image/${imageType ?? "jpeg"}`, 0.8);
    setCropped(base64);

    createRecord();
}

export function resetCrop(
    cropper: Cropper | null,
    reinitialize: () => void
): void {
    if (!cropper)
        return;

    cropper.reset();
    reinitialize();
}

export function clearImage(
    cropper: Cropper | null,
    imageElement: HTMLImageElement,
    previewContainer: HTMLDivElement,
    clearState: () => void
): void {
    if (cropper) 
        cropper.destroy();

    imageElement.src = "";
    previewContainer.innerHTML = "";

    clearState();
}

export async function saveNewOrder(
    context: ComponentFramework.Context<any>,
    imageListContainer: HTMLDivElement,
    entityName: string,
    sortColumn: string
): Promise<void> {
    const cards = imageListContainer.children;
    
    for (let i = 0; i < cards.length; i++) {
        const card = cards[i] as HTMLElement;
        const id = card.dataset.id;

        if (!id) 
            continue;

        await context.webAPI.updateRecord(
            entityName,
            id,
            { [sortColumn]: i + 1 }
        );
    }
}