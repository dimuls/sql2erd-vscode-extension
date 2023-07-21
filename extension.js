const vscode = require("vscode");
const { execSync } = require("child_process");
const debounce = require("lodash.debounce");
const path = require("path");

let panels = {};

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  const render = (document, alt) => {
    const config = vscode.workspace.getConfiguration("sql2erd");
    let binPath = config.get("binPath");

    const sql = document.getText();
    let svg;

    let panel = panels[document.fileName];

    let dark = false;

    switch (vscode.window.activeColorTheme.kind) {
      case vscode.ColorThemeKind.Dark:
      case vscode.ColorThemeKind.HighContrast:
        dark = true;
        break;
    }

    if (dark) {
      binPath += " -t dark";
    }

    try {
      svg = execSync(binPath, {
        input: sql,
      });
    } catch (error) {
      if (!panel) {
        vscode.window.showErrorMessage(
          `Exec sql2erd: exit status ${error.status
          }. ${error.stderr.toString()}`
        );
      }

      throw error;
    }

    if (!panel) {
      let viewColumn = vscode.ViewColumn.Two;
      if (alt) {
        viewColumn = vscode.ViewColumn.One;
      }

      panel = vscode.window.createWebviewPanel(
        "sql2erd.svg",
        `ERD of ${path.basename(document.fileName)}`,
        viewColumn,
        {}
      );

      panel.onDidDispose(() => delete panels[document.fileName]);
      panels[document.fileName] = panel;
    }

    panel.webview.html = svg.toString();
    panel.reveal(undefined, true);
  };

  let disposable = vscode.commands.registerCommand("sql2erd.render", () => {
    render(vscode.window.activeTextEditor.document);
  });

  context.subscriptions.push(disposable);

  disposable = vscode.commands.registerCommand("sql2erd.renderAlt", () => {
    render(vscode.window.activeTextEditor.document, true);
  });

  context.subscriptions.push(disposable);

  const onTextChange = debounce((event) => {
    if (!event.document || event.document.languageId !== "sql") {
      return;
    }

    if (!panels[event.document.fileName]) {
      return;
    }

    render(event.document);
  }, 500);

  vscode.workspace.onDidChangeTextDocument(
    onTextChange,
    null,
    context.subscriptions
  );
}

// This method is called when your extension is deactivated
function deactivate() { }

module.exports = {
  activate,
  deactivate,
};
