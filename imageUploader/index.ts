import { IInputs, IOutputs } from "./generated/ManifestTypes";
import Cropper from "cropperjs";
import "cropperjs/dist/cropper.css";
import Sortable from "sortablejs";
import { clearImage, cropImage, resetCrop, saveNewOrder, saveOriginal } from "./utils/imageActions";
import {
    createImageRecord,
    retrieveImages,
    deleteImage
} from "./services/dataverseService";
import { loadCategoriesLogic } from "./services/logicService";
import { PropertyImageConfig } from "./utils/dataverse.config";

export class PropertyImageManager implements ComponentFramework.StandardControl<IInputs, IOutputs> {

    private context: ComponentFramework.Context<IInputs>;
    private container: HTMLDivElement;

    private parentId: string | null = null;
    private parentEntityName: string;
    private parentLookupSchema: string;

    private categoryDropdown: HTMLSelectElement;
    private fileInput: HTMLInputElement;
    private imageElement: HTMLImageElement;
    private previewContainer: HTMLDivElement;
    private dropZone: HTMLDivElement;
    private imageListContainer: HTMLDivElement;

    private cropper: Cropper | null = null;
    private originalImageBase64: string | null = null;
    private croppedImageBase64: string | null = null;

    private isUploadEnabled: boolean = false;
    private imageType: string = "jpeg";
    private imageName: string = `Property Image ${new Date().toISOString()}`;
    private images: any[] = [];

    private previewTooltip: HTMLDivElement;
    private previewImage: HTMLImageElement;
    private sortableInstance: Sortable | null = null;

    constructor() {}

    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        state: ComponentFramework.Dictionary,
        container: HTMLDivElement
    ): void {
        this.context = context;
        this.container = container;

        this.container.classList.add("property-image-manager");

        this.renderUI();
        this.createPreviewTooltip();
    }

    private initializeCropper(): void {
        if (this.cropper) {
            this.cropper.destroy();
            this.cropper = null;
        }

        this.cropper = new Cropper(this.imageElement, {
            aspectRatio: 2,
            viewMode: 1,
            autoCropArea: 1,
            preview: this.previewContainer
        });
    }

    private renderUI(): void {
        // ===== Main Row =====
        const mainRow = document.createElement("div");
        mainRow.classList.add("main-row");

        const imageWrapper = document.createElement("div");
        imageWrapper.classList.add("image-wrapper");
        
        const placeholder = document.createElement("span");
        placeholder.innerText = "Click to select image";
        placeholder.classList.add("placeholder-text");
        imageWrapper.appendChild(placeholder);

        imageWrapper.onclick = () => {
            if (!this.originalImageBase64) 
                this.fileInput.click();
        };

        this.imageElement = document.createElement("img");
        imageWrapper.appendChild(this.imageElement);

        mainRow.appendChild(imageWrapper);

        // ===== Preview Section =====

        const previewWrapper = document.createElement("div");
        previewWrapper.classList.add("preview-wrapper");

        this.previewContainer = document.createElement("div");
        this.previewContainer.classList.add("preview-container");

        const previewTitle = document.createElement("h3");
        previewTitle.classList.add("preview-title");
        previewTitle.innerHTML = "Note:";

        const previewNote = document.createElement("p");
        previewNote.classList.add("preview-title");
        previewNote.innerText = "Use your scroll wheel to zoom in/out on the image";

        previewWrapper.appendChild(this.previewContainer);
        previewWrapper.appendChild(previewTitle);
        previewWrapper.appendChild(previewNote);

        mainRow.appendChild(previewWrapper);
        this.container.appendChild(mainRow);

        // ===== File Input =====
        this.fileInput = document.createElement("input");
        this.fileInput.type = "file";
        this.fileInput.accept = "image/*";
        this.fileInput.style.display = "none";

        this.fileInput.addEventListener("click", () => this.fileInput.value = "");
         
        this.fileInput.addEventListener("change", (event) => {
            const file = (event.target as HTMLInputElement).files?.[0];
            if (file) 
                this.handleImage(file);
        });

        this.container.appendChild(this.fileInput);

        // ===== Drag & Drop =====
        this.dropZone = document.createElement("div");
        this.dropZone.classList.add("drop-zone");
        this.dropZone.innerText = "Drag & Drop Image Here";

        this.initializeDragAndDrop();
        this.container.appendChild(this.dropZone);

        // ===== Image name =====
        const nameWrapper = document.createElement("div");
        nameWrapper.classList.add("name-wrapper");

        const nameLabel = document.createElement("div");
        nameLabel.classList.add("name-label");
        nameLabel.innerText = "Image Name: ";
        const nameInput = document.createElement("input");
        nameInput.classList.add("name-input");
        nameInput.type = "text";
        nameInput.placeholder = "Enter image name";
        nameInput.classList.add("name-input");
        nameInput.addEventListener("change", (e) => {
            this.imageName = (e.target as HTMLInputElement).value;
        });

        nameWrapper.appendChild(nameLabel);
        nameWrapper.appendChild(nameInput);
        this.container.appendChild(nameWrapper);

        // ===== Category Dropdown =====
        const categoryWrapper = document.createElement("div");
        categoryWrapper.classList.add("category-wrapper");

        const categoryLabel = document.createElement("div");
        categoryLabel.classList.add("category-label");
        categoryLabel.innerHTML = "Choose Image Type: ";

        this.categoryDropdown = document.createElement("select");
        this.categoryDropdown.classList.add("category-dropdown");
        this.categoryDropdown.disabled = false;

        categoryWrapper.appendChild(categoryLabel);
        categoryWrapper.appendChild(this.categoryDropdown);
        this.container.appendChild(categoryWrapper);

        // ===== Buttons =====
        const buttonRow = document.createElement("div");
        buttonRow.classList.add("button-row");

        const saveOriginalBtn = document.createElement("button");
        saveOriginalBtn.classList.add("btn", "btn-primary");
        saveOriginalBtn.innerText = "Save";
        saveOriginalBtn.onclick = () =>
            saveOriginal(
                this.originalImageBase64,
                (val) => this.originalImageBase64 = val,
                async () => {
                    console.log("Saving original image...", this.images);
                    await createImageRecord(
                        this.context,
                        this.parentEntityName,
                        this.parentLookupSchema,
                        this.parentId!,
                        this.originalImageBase64!,
                        this.imageName,
                        this.images,
                        this.categoryDropdown.value
                            ? Number(this.categoryDropdown.value)
                            : undefined,
                        this.imageType,
                    );

                    this.images = await retrieveImages(
                        this.context,
                        this.parentLookupSchema,
                        this.parentId!
                    );
                    this.renderImages(this.images);
                    clearBtn.click();
                }
            );
            
            const cropSaveBtn = document.createElement("button");
            cropSaveBtn.classList.add("btn", "btn-success");
            cropSaveBtn.innerText = "Crop & Save";
            
            cropSaveBtn.onclick = () =>
                cropImage(
                    this.cropper,
                    (val) => this.croppedImageBase64 = val,
                    async () => {                        
                        await createImageRecord(
                            this.context,
                            this.parentEntityName,
                            this.parentLookupSchema,
                            this.parentId!,
                            this.croppedImageBase64!,
                            this.imageName,
                            this.images,
                            this.categoryDropdown.value
                            ? Number(this.categoryDropdown.value)
                            : undefined,
                            this.imageType
                        );
                    
                        this.images = await retrieveImages(
                            this.context,
                            this.parentLookupSchema,
                            this.parentId!
                        );
                        
                        this.renderImages(this.images);
                        clearBtn.click();
                    },
                    this.imageType
                );
            
            const resetCropBtn = document.createElement("button");
            resetCropBtn.classList.add("btn", "btn-warning");
            resetCropBtn.innerText = "Remove Cropped Formatting";
            
            resetCropBtn.onclick = () =>
                resetCrop(
                    this.cropper,
                    () => this.initializeCropper()
                );
                
        const clearBtn = document.createElement("button");
        clearBtn.classList.add("btn", "btn-danger");
        clearBtn.innerText = "Clear Image";
        
        clearBtn.onclick = () =>
            clearImage(
                this.cropper,
                this.imageElement,
                this.previewContainer,
                () => {
                    this.originalImageBase64 = null;
                    this.croppedImageBase64 = null;
                    this.imageElement.src = "";
                    this.previewContainer.innerHTML = "";
                    this.cropper = null;
                }
            );
            
        buttonRow.appendChild(saveOriginalBtn); 
        buttonRow.appendChild(cropSaveBtn);
        buttonRow.appendChild(resetCropBtn);
        buttonRow.appendChild(clearBtn);

        this.container.appendChild(buttonRow);

        // ===== Existing Images =====
        const divider = document.createElement("hr");
        this.container.appendChild(divider);

        const listTitle = document.createElement("h4");
        listTitle.innerText = "Existing Images";
        this.container.appendChild(listTitle);

        this.imageListContainer = document.createElement("div");
        this.imageListContainer.classList.add("image-list");
        this.container.appendChild(this.imageListContainer);

        const saveOrderBtn = document.createElement("button");
        saveOrderBtn.classList.add("btn","btn-primary", "save-order-btn");
        saveOrderBtn.innerText = "Save Image Order";

        saveOrderBtn.onclick = async () => {
            await saveNewOrder(
                this.context,
                this.imageListContainer,
                PropertyImageConfig.entity.propertyImage,
                PropertyImageConfig.fields.sortOrder
            );
        };
        this.container.appendChild(saveOrderBtn);
    }

    public async updateView(context: ComponentFramework.Context<IInputs>): Promise<void> {
        this.context = context;

        const bgColor = context.parameters.backgroundColor.raw;
        if (bgColor) 
            this.container.style.backgroundColor = bgColor;

        this.parentEntityName = context.parameters.parentEntityName.raw!;
        this.parentLookupSchema = context.parameters.parentLookupSchema.raw!;

        const rawId = (context as any).page.entityId;
        // this.renderTempImages()

        if (rawId) {
            this.parentId = rawId.replace(/[{}]/g, "");
            this.isUploadEnabled = true;

            this.images = await retrieveImages(
                this.context,
                this.parentLookupSchema,
                this.parentId!
            );

            this.renderImages(this.images);
            await loadCategoriesLogic(this.context, this.categoryDropdown);
        } 
        else {
            this.parentId = null;
            this.isUploadEnabled = false;
        }
        this.updateUploadState();
    }

    public getOutputs(): IOutputs { return {}; }

    public destroy(): void {
        while (this.container.firstChild) {
            this.container.removeChild(this.container.firstChild);
        }
    }

    private handleImage(file: File): void {
        if (!this.isUploadEnabled) {
            alert("Please save record first.");
            return;
        }

        if (!file.type.startsWith("image/")) {
            alert("Invalid file type.");
            return;
        }
        
        this.imageType = file.type.split("/")[1]; 
        const reader = new FileReader();

        reader.onload = () => {
            this.originalImageBase64 = reader.result as string;
            this.imageElement.src = this.originalImageBase64!;
            this.initializeCropper();
        };
        reader.readAsDataURL(file);
    }

    private updateUploadState(): void {
        this.dropZone.style.pointerEvents = this.isUploadEnabled ? "auto" : "none";
    }

    private initializeDragAndDrop(): void {
        this.dropZone.addEventListener("dragover", (e) => {
            e.preventDefault();
            this.dropZone.style.borderColor = "#000";
        });

        this.dropZone.addEventListener("dragleave", () => {
            this.dropZone.style.borderColor = "#aaa";
        });

        this.dropZone.addEventListener("drop", (e) => {
            e.preventDefault();
            this.dropZone.style.borderColor = "#aaa";

            const file = e.dataTransfer?.files[0];
            if (file && file.type.startsWith("image/")) 
                this.handleImage(file);
        });
    }

    private renderImages(images: any[]): void {
        this.imageListContainer.innerHTML = "";

        images.forEach(img => {
            const card = document.createElement("div");
            card.classList.add("image-card");

            card.dataset.id = String(img[PropertyImageConfig.fields.imageId]);

            const image = document.createElement("img");
            image.draggable = false;
            image.classList.add("main-image");
            image.src = img[PropertyImageConfig.fields.imageData];

            const labelWrapper = document.createElement("div");
            labelWrapper.classList.add("label-wrapper");

            const deleteBtn = document.createElement("button");
            deleteBtn.classList.add("btn", "btn-delete");
            deleteBtn.innerText = "Delete";

            deleteBtn.onclick = async () => {
                if (!confirm("Delete this image?")) 
                    return;
                await deleteImage(
                    this.context,
                    img[PropertyImageConfig.fields.imageId]
                );
                
                const refreshed = await retrieveImages(
                    this.context,
                    this.parentLookupSchema,
                    this.parentId!
                );
                this.renderImages(refreshed);
            };

            const ShowCategory = document.createElement("div");
            ShowCategory.classList.add("category-display");
            ShowCategory.innerText = img[`${PropertyImageConfig.fields.category}@OData.Community.Display.V1.FormattedValue`] ?? "Uncategorized";

            card.appendChild(image);
            labelWrapper.appendChild(ShowCategory);
            labelWrapper.appendChild(deleteBtn);
            card.appendChild(labelWrapper);

            this.imageListContainer.appendChild(card);

            /* -------- tooltip -------- */

            image.addEventListener("mouseenter", (event: MouseEvent) => {
                const target = event.target as HTMLImageElement;
                this.previewImage.src = target.src;

                const imageName =
                    img[PropertyImageConfig.fields.imageName]

                this.previewTooltip.innerHTML = `
                    <div class="preview-category">${imageName ?? "Uncategorized"}</div>
                    <img src="${target.src}" class="apple-preview-image"/>
                `;
                this.previewTooltip.style.opacity = "1";
                this.previewTooltip.style.transform = "scale(1)";
            });

            image.addEventListener("mousemove", (event: MouseEvent) => {
                const offset = 20;
                this.previewTooltip.style.left = event.clientX + offset + "px";
                this.previewTooltip.style.top = event.clientY + offset + "px";
            });

            image.addEventListener("mouseleave", () => {
                this.previewTooltip.style.opacity = "0";
                this.previewTooltip.style.transform = "scale(0.95)";
            });
        });

        this.initializeSortable();
    }

    private initializeSortable(): void {
        if (this.sortableInstance) 
            return;

        this.sortableInstance = Sortable.create(this.imageListContainer, {
            animation: 200,
            draggable: ".image-card",
            ghostClass: "dragging",
            chosenClass: "dragging",

            forceFallback: true,     
            fallbackOnBody: true,    
            swapThreshold: 0.65,     
        });
    }

    private createPreviewTooltip(): void {
        this.previewTooltip = document.createElement("div");
        this.previewTooltip.className = "apple-preview-tooltip";

        this.previewImage = document.createElement("img");
        this.previewImage.className = "apple-preview-image";

        this.previewTooltip.appendChild(this.previewImage);
        document.body.appendChild(this.previewTooltip);
    }

    

    // private renderTempImages(): void {
    //     const tempImages = [
    //         {
    //             ss_propertyimageid: "temp1",
    //             ss_imagedata: "https://picsum.photos/300/150?random=1"
    //         },
    //         {
    //             ss_propertyimageid: "temp2",
    //             ss_imagedata: "https://picsum.photos/300/150?random=2"
    //         },
    //         {
    //             ss_propertyimageid: "temp3",
    //             ss_imagedata: "https://picsum.photos/300/150?random=3"
    //         },
    //         {
    //             ss_propertyimageid: "temp4",
    //             ss_imagedata: "https://picsum.photos/300/150?random=4"
    //         },
    //         {
    //             ss_propertyimageid: "temp5",
    //             ss_imagedata: "https://picsum.photos/300/150?random=5"
    //         },
    //         {
    //             ss_propertyimageid: "temp6",
    //             ss_imagedata: "https://picsum.photos/300/150?random=6"
    //         },
    //         {
    //             ss_propertyimageid: "temp7",
    //             ss_imagedata: "https://picsum.photos/300/150?random=7"
    //         },
    //         {
    //             ss_propertyimageid: "temp8",
    //             ss_imagedata: "https://picsum.photos/300/150?random=8"
    //         },
    //         {
    //             ss_propertyimageid: "temp9",
    //             ss_imagedata: "https://picsum.photos/300/150?random=9"
    //         }
    //     ];
    //     this.images = tempImages;

    //     this.renderImages(tempImages);

    // }
}