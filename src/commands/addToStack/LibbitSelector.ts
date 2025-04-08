import * as vscode from "vscode";
import { Libbit } from "./Types";

export class LibbitSelector {
  public async showLibbitQuickPick(libbits: Libbit[]): Promise<Libbit | undefined> {
    interface LibbitQuickPickItem extends vscode.QuickPickItem {
      libbit: Libbit;
    }

    const quickPickItems: LibbitQuickPickItem[] = libbits.map(libbit => {
      // Get the clibbit count
      let clibbitCount = 0;
      if (typeof libbit.clibbit_count === 'number') {
        clibbitCount = libbit.clibbit_count;
      } else if (Array.isArray(libbit.clibbit_count) && libbit.clibbit_count.length > 0) {
        clibbitCount = libbit.clibbit_count[0].count;
      }

      return {
        label: libbit.name,
        description: `${clibbitCount} clibbits`,
        detail: libbit.description || '',
        libbit: libbit
      };
    });

    const selectedItem = await vscode.window.showQuickPick(quickPickItems, {
      placeHolder: "Select a libbit",
      title: "Available Libbits",
      canPickMany: false
    });

    return selectedItem?.libbit;
  }
}
