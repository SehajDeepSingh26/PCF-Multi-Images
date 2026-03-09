import { IInputs } from "../generated/ManifestTypes";
import { PropertyImageConfig } from "../utils/dataverse.config";

export async function loadCategories(
    context: ComponentFramework.Context<IInputs>
): Promise<any[]> {

    const metadata: any = await context.utils.getEntityMetadata(
        PropertyImageConfig.entity.propertyImage,
        [PropertyImageConfig.fields.category]
    );

    const attribute = metadata.Attributes.get(PropertyImageConfig.fields.category);

    if (!attribute || !attribute.OptionSet) {
        console.error("Category OptionSet not found");
        return [];
    }

    const options = Object.values(attribute._optionSet);
    return options;
}

export async function createImageRecord(
    context: ComponentFramework.Context<IInputs>,
    parentEntityName: string,
    parentLookupSchema: string,
    parentId: string,
    base64Image: string,
    imageName: string,
    categoryValue?: number,
    imageType?: string 
): Promise<void> {

    const images = await retrieveImages(context, parentLookupSchema, parentId);

    const maxOrder = images.length > 0
        ? Math.max(...images.map(i => i.ss_sortorder || 0))
        : 0;

    const data: any = {
        [PropertyImageConfig.fields.imageData]: base64Image,
        [PropertyImageConfig.fields.imageName]: imageName,
        [PropertyImageConfig.fields.imageType]: imageType,
        [PropertyImageConfig.fields.sortOrder]: maxOrder+1
    };

    if (categoryValue !== undefined) {
        data[PropertyImageConfig.fields.category] = categoryValue;
    }

    data[`${parentLookupSchema}@odata.bind`] =
        `/${PropertyImageConfig.entity.properties}(${parentId})`;

    await context.webAPI.createRecord(
        PropertyImageConfig.entity.propertyImage,
        data
    );
}

export async function retrieveImages(
    context: ComponentFramework.Context<IInputs>,
    parentLookupSchema: string,
    parentId: string
) {

    const lookupLogical = parentLookupSchema.toLowerCase();

    const query =
        `?$select=${PropertyImageConfig.fields.imageId},
        ${PropertyImageConfig.fields.imageData},
        ${PropertyImageConfig.fields.category},
        ${PropertyImageConfig.fields.sortOrder},
        ${PropertyImageConfig.fields.imageName},
        &$filter=_${lookupLogical}_value eq ${parentId}
        &$orderby=ss_sortorder asc`;

    const result = await context.webAPI.retrieveMultipleRecords(
        PropertyImageConfig.entity.propertyImage,
        query
    );

    return result.entities;
}

export async function deleteImage(
    context: ComponentFramework.Context<IInputs>,
    id: string
): Promise<void> {

    await context.webAPI.deleteRecord(
        PropertyImageConfig.entity.propertyImage,
        id
    );
}