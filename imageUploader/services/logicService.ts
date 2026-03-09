import { IInputs } from "../generated/ManifestTypes";
import {
    loadCategories
} from "./dataverseService";

export async function loadCategoriesLogic(
    context: ComponentFramework.Context<IInputs>,
    dropdown: HTMLSelectElement
) {

    const options = await loadCategories(context);

    dropdown.innerHTML = "";

    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.text = "Select Category";
    dropdown.appendChild(defaultOption);

    options.forEach(opt => {
        const option = document.createElement("option");

        option.value = String(opt.value);
        option.text = opt.text ?? "";

        dropdown.appendChild(option);
    });
}
