import * as vscode from "vscode";

export class CategorySelector {
  private readonly categoryOptions = [
    "Authentication",
    "Navigation",
    "Style",
    "Structure",
    "Analytics",
    "Framework",
    "Syntax",
    "Other",
  ];

  public async showCategoryQuickPick(): Promise<string | undefined> {
    const selectedCategory = await vscode.window.showQuickPick(this.categoryOptions, {
      placeHolder: "Select a category",
      title: "Libbit Categories",
      canPickMany: false
    });

    return selectedCategory;
  }
}
