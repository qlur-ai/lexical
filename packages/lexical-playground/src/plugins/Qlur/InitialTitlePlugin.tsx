// src/plugins/InitialTitlePlugin.tsx
import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $createHeadingNode } from '@lexical/rich-text';
import {
  $getRoot,
  $createTextNode,
  $setSelection,
  $getSelection,
  $isRangeSelection,
} from 'lexical';

// Lexical Format Constants
const IS_BOLD = 1;

function InitialTitlePlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    let isInitial = true;

    editor.update(() => {
      const root = $getRoot();
      const firstChild = root.getFirstChild();

      if (isInitial && (root.isEmpty() || (firstChild && firstChild.isEmpty() && firstChild.isAttached()))) {
        isInitial = false;
        root.clear();
        const heading = $createHeadingNode('h1');
        const textNode = $createTextNode('');
        heading.append(textNode);
        root.append(heading);

        // Select the empty text node
        const selection = textNode.select(0, 0);
        $setSelection(selection);

        // Directly set the selection format to bold
        const currentSelection = $getSelection();
        if ($isRangeSelection(currentSelection)) {
          currentSelection.format = IS_BOLD; // Set format bitmask directly
        }

        // Focus the editor
        editor.focus();
      }
    });
  }, [editor]);

  return null;
}

export default InitialTitlePlugin;