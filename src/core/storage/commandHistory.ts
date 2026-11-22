// ============================================================================
// commandHistory - Command Pattern for Unlimited Undo / Redo
// ============================================================================

import { Project } from '../../types/editor';

export interface Command {
  execute(): void;
  undo(): void;
  description?: string;
}

export class CommandHistory {
  private undoStack: string[] = [];
  private redoStack: string[] = [];
  private maxHistory: number;

  constructor(maxHistory = 100) {
    this.maxHistory = maxHistory;
  }

  public recordState(project: Project) {
    const serialized = JSON.stringify(project);
    // Don't push duplicates
    if (this.undoStack.length > 0 && this.undoStack[this.undoStack.length - 1] === serialized) {
      return;
    }
    this.undoStack.push(serialized);
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
    // Clear redo when a new action is performed
    this.redoStack = [];
  }

  public undo(currentProject: Project): Project | null {
    if (this.undoStack.length <= 1) return null;

    // Current state pushed to redo
    const current = this.undoStack.pop();
    if (current) {
      this.redoStack.push(current);
    }

    const previousSerialized = this.undoStack[this.undoStack.length - 1];
    if (!previousSerialized) return null;

    try {
      return JSON.parse(previousSerialized) as Project;
    } catch {
      return null;
    }
  }

  public redo(): Project | null {
    if (this.redoStack.length === 0) return null;

    const nextSerialized = this.redoStack.pop();
    if (!nextSerialized) return null;

    this.undoStack.push(nextSerialized);
    try {
      return JSON.parse(nextSerialized) as Project;
    } catch {
      return null;
    }
  }

  public canUndo(): boolean {
    return this.undoStack.length > 1;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  public getSnapshot(): { undoStack: string[]; redoStack: string[] } {
    return {
      undoStack: [...this.undoStack],
      redoStack: [...this.redoStack],
    };
  }

  public restoreSnapshot(snapshot: { undoStack: string[]; redoStack: string[] }) {
    this.undoStack = [...snapshot.undoStack];
    this.redoStack = [...snapshot.redoStack];
  }

  public clear() {
    this.undoStack = [];
    this.redoStack = [];
  }
}
