import * as vscode from 'vscode';
import { SupymemAPI, Constraint } from '../api';

export class ConstraintDecorations {
    private _api: SupymemAPI;
    private _decorationTypes: Map<string, vscode.TextEditorDecorationType> = new Map();
    private _enabled: boolean = true;
    private _disposables: vscode.Disposable[] = [];

    // Decoration types for different severities
    private _criticalDecoration: vscode.TextEditorDecorationType;
    private _highDecoration: vscode.TextEditorDecorationType;
    private _mediumDecoration: vscode.TextEditorDecorationType;
    private _lowDecoration: vscode.TextEditorDecorationType;
    private _lockDecoration: vscode.TextEditorDecorationType;

    constructor(api: SupymemAPI) {
        this._api = api;

        // Create decoration types
        this._criticalDecoration = vscode.window.createTextEditorDecorationType({
            gutterIconPath: this._createSvgUri('🔴'),
            gutterIconSize: 'contain',
            overviewRulerColor: '#ff4444',
            overviewRulerLane: vscode.OverviewRulerLane.Right,
            backgroundColor: 'rgba(255, 68, 68, 0.05)',
            isWholeLine: true
        });

        this._highDecoration = vscode.window.createTextEditorDecorationType({
            gutterIconPath: this._createSvgUri('🟠'),
            gutterIconSize: 'contain',
            overviewRulerColor: '#ff8800',
            overviewRulerLane: vscode.OverviewRulerLane.Right,
            backgroundColor: 'rgba(255, 136, 0, 0.03)',
            isWholeLine: true
        });

        this._mediumDecoration = vscode.window.createTextEditorDecorationType({
            gutterIconPath: this._createSvgUri('🟡'),
            gutterIconSize: 'contain',
            overviewRulerColor: '#ffcc00',
            overviewRulerLane: vscode.OverviewRulerLane.Right
        });

        this._lowDecoration = vscode.window.createTextEditorDecorationType({
            gutterIconPath: this._createSvgUri('🟢'),
            gutterIconSize: 'contain',
            overviewRulerColor: '#44bb44',
            overviewRulerLane: vscode.OverviewRulerLane.Right
        });

        this._lockDecoration = vscode.window.createTextEditorDecorationType({
            gutterIconPath: this._createSvgUri('🔒'),
            gutterIconSize: 'contain',
            overviewRulerColor: '#ff4444',
            overviewRulerLane: vscode.OverviewRulerLane.Left,
            backgroundColor: 'rgba(255, 68, 68, 0.08)',
            isWholeLine: true,
            before: {
                contentText: '🔒',
                margin: '0 8px 0 0'
            }
        });
    }

    public updateApi(api: SupymemAPI): void {
        this._api = api;
    }

    public toggle(): void {
        this._enabled = !this._enabled;
        
        if (this._enabled) {
            this.refreshDecorations();
        } else {
            this.clearDecorations();
        }

        vscode.window.showInformationMessage(
            `Constraint markers ${this._enabled ? 'enabled' : 'disabled'}`
        );
    }

    public startWatching(): vscode.Disposable[] {
        // Watch for active editor changes
        this._disposables.push(
            vscode.window.onDidChangeActiveTextEditor((editor) => {
                if (editor && this._enabled) {
                    this.updateDecorations(editor);
                }
            })
        );

        // Watch for document changes
        this._disposables.push(
            vscode.workspace.onDidChangeTextDocument((event) => {
                if (this._enabled) {
                    const editor = vscode.window.activeTextEditor;
                    if (editor && event.document === editor.document) {
                        // Debounce
                        setTimeout(() => this.updateDecorations(editor), 500);
                    }
                }
            })
        );

        // Initial decoration
        if (vscode.window.activeTextEditor && this._enabled) {
            this.updateDecorations(vscode.window.activeTextEditor);
        }

        return this._disposables;
    }

    public async refreshDecorations(): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            await this.updateDecorations(editor);
        }
    }

    public clearDecorations(): void {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            editor.setDecorations(this._criticalDecoration, []);
            editor.setDecorations(this._highDecoration, []);
            editor.setDecorations(this._mediumDecoration, []);
            editor.setDecorations(this._lowDecoration, []);
            editor.setDecorations(this._lockDecoration, []);
        }
    }

    private async updateDecorations(editor: vscode.TextEditor): Promise<void> {
        if (!this._enabled) {
            return;
        }

        const document = editor.document;
        const filePath = document.uri.fsPath;
        
        // Skip non-file documents
        if (document.uri.scheme !== 'file') {
            return;
        }

        try {
            const constraints = await this._api.getActiveConstraints(filePath);
            const text = document.getText();
            
            // Find constraint markers in the code
            const criticalRanges: vscode.DecorationOptions[] = [];
            const highRanges: vscode.DecorationOptions[] = [];
            const mediumRanges: vscode.DecorationOptions[] = [];
            const lowRanges: vscode.DecorationOptions[] = [];
            const lockRanges: vscode.DecorationOptions[] = [];

            // Look for constraint patterns in code
            await this._findConstraintPatterns(
                document, text, constraints,
                { criticalRanges, highRanges, mediumRanges, lowRanges, lockRanges }
            );

            // Apply decorations
            editor.setDecorations(this._criticalDecoration, criticalRanges);
            editor.setDecorations(this._highDecoration, highRanges);
            editor.setDecorations(this._mediumDecoration, mediumRanges);
            editor.setDecorations(this._lowDecoration, lowRanges);
            editor.setDecorations(this._lockDecoration, lockRanges);

        } catch (error) {
            console.error('Failed to update constraint decorations:', error);
        }
    }

    private async _findConstraintPatterns(
        document: vscode.TextDocument,
        text: string,
        constraints: Constraint[],
        ranges: {
            criticalRanges: vscode.DecorationOptions[];
            highRanges: vscode.DecorationOptions[];
            mediumRanges: vscode.DecorationOptions[];
            lowRanges: vscode.DecorationOptions[];
            lockRanges: vscode.DecorationOptions[];
        }
    ): Promise<void> {
        // Pattern matchers for common constraint-related code patterns
        const patterns = [
            // Security patterns
            { regex: /password|secret|token|auth|credential|api[_-]?key/gi, type: 'security' },
            // Performance patterns
            { regex: /setTimeout|setInterval|async|await|promise|cache|memo/gi, type: 'performance' },
            // Cost patterns
            { regex: /fetch|axios|http|request|api|external/gi, type: 'cost' },
            // Lock patterns (DO NOT MODIFY comments)
            { regex: /DO\s*NOT\s*(MODIFY|CHANGE|EDIT|DELETE|REMOVE)/gi, type: 'lock' },
            // Approval patterns
            { regex: /@(approved|reviewed)\s*by/gi, type: 'lock' },
            // Critical sections
            { regex: /CRITICAL|IMPORTANT|WARNING|CAUTION/gi, type: 'critical' }
        ];

        // Find matches
        for (const pattern of patterns) {
            let match;
            while ((match = pattern.regex.exec(text)) !== null) {
                const startPos = document.positionAt(match.index);
                const endPos = document.positionAt(match.index + match[0].length);
                const range = new vscode.Range(startPos, endPos);
                
                const constraint = constraints.find(c => c.type === pattern.type);
                const hoverMessage = this._createHoverMessage(pattern.type, constraint);

                const decoration: vscode.DecorationOptions = {
                    range,
                    hoverMessage
                };

                // Categorize by type/severity
                if (pattern.type === 'lock') {
                    ranges.lockRanges.push({
                        ...decoration,
                        range: new vscode.Range(
                            new vscode.Position(startPos.line, 0),
                            new vscode.Position(startPos.line, Number.MAX_VALUE)
                        )
                    });
                } else if (pattern.type === 'critical' || (constraint && constraint.severity === 'critical')) {
                    ranges.criticalRanges.push(decoration);
                } else if (pattern.type === 'security' || (constraint && constraint.severity === 'high')) {
                    ranges.highRanges.push(decoration);
                } else if (pattern.type === 'performance' || (constraint && constraint.severity === 'medium')) {
                    ranges.mediumRanges.push(decoration);
                } else {
                    ranges.lowRanges.push(decoration);
                }
            }
        }
    }

    private _createHoverMessage(type: string, constraint?: Constraint): vscode.MarkdownString {
        const md = new vscode.MarkdownString();
        md.isTrusted = true;

        if (constraint) {
            md.appendMarkdown(`**🔒 Constraint Active**\n\n`);
            md.appendMarkdown(`**Type:** ${constraint.type}\n\n`);
            md.appendMarkdown(`**Severity:** ${constraint.severity}\n\n`);
            md.appendMarkdown(`${constraint.description}\n\n`);
            if (constraint.approved_by) {
                md.appendMarkdown(`*Approved by @${constraint.approved_by}*`);
            }
        } else {
            const icons: Record<string, string> = {
                security: '🔒',
                performance: '⚡',
                cost: '💰',
                lock: '🔐',
                critical: '🚨'
            };

            const descriptions: Record<string, string> = {
                security: 'Security-sensitive code. Review carefully before changes.',
                performance: 'Performance-critical section. Consider impact of changes.',
                cost: 'External service call. Consider cost implications.',
                lock: 'Protected section. Approval may be required.',
                critical: 'Critical code section. Extra care required.'
            };

            md.appendMarkdown(`**${icons[type] || '⚠️'} ${type.charAt(0).toUpperCase() + type.slice(1)} Area**\n\n`);
            md.appendMarkdown(descriptions[type] || 'Relevant code area.');
        }

        md.appendMarkdown('\n\n---\n');
        md.appendMarkdown('[Check Constraints](command:supymem.checkConstraints)');

        return md;
    }

    private _createSvgUri(emoji: string): vscode.Uri {
        // For demo purposes, we'll use ThemeIcons instead
        // In production, you'd create actual SVG files
        return vscode.Uri.parse(`data:image/svg+xml,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
                <text x="0" y="12" font-size="12">${emoji}</text>
            </svg>
        `)}`);
    }

    public dispose(): void {
        this._criticalDecoration.dispose();
        this._highDecoration.dispose();
        this._mediumDecoration.dispose();
        this._lowDecoration.dispose();
        this._lockDecoration.dispose();

        this._decorationTypes.forEach(d => d.dispose());
        this._disposables.forEach(d => d.dispose());
    }
}

// ============================================================================
// CODE LENS PROVIDER FOR CONSTRAINTS
// ============================================================================

export class ConstraintCodeLensProvider implements vscode.CodeLensProvider {
    private _api: SupymemAPI;
    private _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
    public readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

    constructor(api: SupymemAPI) {
        this._api = api;
    }

    public updateApi(api: SupymemAPI): void {
        this._api = api;
        this._onDidChangeCodeLenses.fire();
    }

    public async provideCodeLenses(
        document: vscode.TextDocument,
        _token: vscode.CancellationToken
    ): Promise<vscode.CodeLens[]> {
        const codeLenses: vscode.CodeLens[] = [];
        const text = document.getText();

        // Find "DO NOT MODIFY" patterns
        const lockPattern = /\/\/\s*(DO\s*NOT\s*(MODIFY|CHANGE|EDIT)|PROTECTED|LOCKED|@approved)/gi;
        let match;

        while ((match = lockPattern.exec(text)) !== null) {
            const position = document.positionAt(match.index);
            const range = new vscode.Range(position, position);

            codeLenses.push(new vscode.CodeLens(range, {
                title: '🔒 Protected Section - View Decision',
                command: 'supymem.whyExists',
                arguments: [document.uri.fsPath]
            }));
        }

        // Add code lens at the top of the file for quick access
        if (document.lineCount > 0) {
            const topRange = new vscode.Range(0, 0, 0, 0);
            
            codeLenses.push(new vscode.CodeLens(topRange, {
                title: '🎯 Intent',
                command: 'supymem.showIntentPanel'
            }));

            codeLenses.push(new vscode.CodeLens(topRange, {
                title: '📋 Decisions',
                command: 'supymem.showDecisionTrace',
                arguments: [document.uri.fsPath]
            }));
        }

        return codeLenses;
    }
}

