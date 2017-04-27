'use strict';

import * as vscode from 'vscode';
import * as d3 from 'd3';
import * as dagreD3 from 'dagre-d3';
import * as dot from 'graphlib-dot';

export function activate(context: vscode.ExtensionContext) {

    let previewUri = vscode.Uri.parse('dot-preview://authority/css-preview');

    class TextDocumentContentProvider implements vscode.TextDocumentContentProvider {
        private _onDidChange = new vscode.EventEmitter<vscode.Uri>();

        public provideTextDocumentContent(uri: vscode.Uri): string {
            return this.createCssSnippet();
        }

        get onDidChange(): vscode.Event<vscode.Uri> {
            return this._onDidChange.event;
        }

        public update(uri: vscode.Uri) {
            this._onDidChange.fire(uri);
        }

        private createCssSnippet() {
            let editor = vscode.window.activeTextEditor;

            if (!(editor.document.languageId === 'dot')) {
                return this.errorSnippet("Active editor doesn't show a Graphviz (DOT) document - nothing to preview.")
            }
            return this.extractSnippet();
        }

        private extractSnippet(): string {
            let editor = vscode.window.activeTextEditor;
            let text = editor.document.getText();
            // let selStart = editor.document.offsetAt(editor.selection.anchor);
            // let propStart = text.lastIndexOf('{', selStart);
            // let propEnd = text.indexOf('}', selStart);

            // if (propStart === -1 || propEnd === -1) {
            //     return this.errorSnippet("Cannot determine the rule's properties.");
            // } else {
                return this.generateGraphHtml(editor.document);
            // }
        }

        private errorSnippet(error: string): string {
            return `
                <body>
                    ${error}
                </body>`;
        }

        private generateGraphHtml(document: vscode.TextDocument): string {
            const dotText = document.getText();
            var graph = dot.read(dotText);

            var nodes = graph.nodes();

            return `
            <html>
                <head lang="en">
                    <base href="">
                    <title>Graphviz (DOT) Graph Preview</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                </head>
                <style>
                    svg {
                        border: 1px solid #999;
                        overflow: hidden;
                    }
                    .node {
                        white-space: nowrap;
                    }
                    .node rect,
                    .node circle,
                    .node ellipse {
                        stroke: #333;
                        fill: #fff;
                        stroke-width: 1.5px;
                    }
                    .cluster rect {
                        stroke: #333;
                        fill: #000;
                        fill-opacity: 0.1;
                        stroke-width: 1.5px;
                    }
                    .edgePath path.path {
                        stroke: #333;
                        stroke-width: 1.5px;
                        fill: none;
                    }
                </style>
                <style>
                    h1, h2 {
                        color: #333;
                    }
                    textarea {
                        width: 800px;
                    }
                    label {
                        margin-top: 1em;
                        display: block;
                    }
                    .error {
                        color: red;
                    }
                </style>
                <body onLoad="tryDraw();">
                    <textarea id="inputGraph" rows="5" style="display: none" onKeyUp="tryDraw();">
                        ${dotText}
                    </textarea>
                    <svg viewBox="0 0 5 10" height="100%" width="100%">
                        <g/>
                    </svg>

                    <script src="http://d3js.org/d3.v3.js"></script>
                    <script src="http://cpettitt.github.io/project/graphlib-dot/v0.5.2/graphlib-dot.js"></script>
                    <script src="http://cpettitt.github.io/project/dagre-d3/latest/dagre-d3.js"></script>

                    <script>
                        var inputGraph = document.querySelector("#inputGraph");

                        // Set up zoom support
                        var svg = d3.select("svg"),
                            inner = d3.select("svg g"),
                            zoom = d3.behavior.zoom().on("zoom", function() {
                            inner.attr("transform", "translate(" + d3.event.translate + ")" +
                                                        "scale(" + d3.event.scale + ")");
                            });

                        svg.call(zoom);
                        // Create and configure the renderer
                        var render = dagreD3.render();
                        function tryDraw() {
                            var g;

                            inputGraph.setAttribute("class", "");
                            try {
                                g = graphlibDot.read(inputGraph.value);
                            } catch (e) {
                                inputGraph.setAttribute("class", "error");
                                throw e;
                            }

                            // Set margins, if not present
                            if (!g.graph().hasOwnProperty("marginx") &&
                                !g.graph().hasOwnProperty("marginy")) {
                            g.graph().marginx = 20;
                            g.graph().marginy = 20;
                        }
                        g.graph().transition = function(selection) {
                        return selection.transition().duration(500);
                        };
                        // Render the graph into svg g
                        d3.select("svg g").call(render, g);
                        }
                    </script>
                </body>
                </html>`;
        }
    }

    let provider = new TextDocumentContentProvider();
    let registration = vscode.workspace.registerTextDocumentContentProvider('dot-preview', provider);

    vscode.workspace.onDidChangeTextDocument((e: vscode.TextDocumentChangeEvent) => {
        if (e.document === vscode.window.activeTextEditor.document) {
            provider.update(previewUri);
        }
    });

    vscode.window.onDidChangeTextEditorSelection((e: vscode.TextEditorSelectionChangeEvent) => {
        if (e.textEditor === vscode.window.activeTextEditor) {
            provider.update(previewUri);
        }
    })

    let disposable = vscode.commands.registerCommand('extension.showDotGraphPreview', () => {
        return vscode.commands.executeCommand('vscode.previewHtml', previewUri, vscode.ViewColumn.Two, 'Graphviz (DOT) Graph Preview').then((success) => {
        }, (reason) => {
            vscode.window.showErrorMessage(reason);
        });
    });

    // let highlight = vscode.window.createTextEditorDecorationType({ backgroundColor: 'rgba(200,200,200,.35)' });

    // vscode.commands.registerCommand('extension.revealCssRule', (uri: vscode.Uri, propStart: number, propEnd: number) => {
    //     for (let editor of vscode.window.visibleTextEditors) {
    //         if (editor.document.uri.toString() === uri.toString()) {
    //             let start = editor.document.positionAt(propStart);
    //             let end = editor.document.positionAt(propEnd + 1);

    //             editor.setDecorations(highlight, [new vscode.Range(start, end)]);
    //             setTimeout(() => editor.setDecorations(highlight, []), 1500);
    //         }
    //     }
    // });

    context.subscriptions.push(disposable, registration);
}