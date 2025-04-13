// src/plugins/DynamicTitlePlugin.tsx
import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $isRootNode,
  COMMAND_PRIORITY_HIGH,
  INSERT_PARAGRAPH_COMMAND,
  DELETE_CHARACTER_COMMAND,
  $isElementNode,
  $setSelection
} from 'lexical';
import { $isHeadingNode, $createHeadingNode } from '@lexical/rich-text';
import { mergeRegister } from '@lexical/utils';

function DynamicTitlePlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const unregister = mergeRegister(
      // --- Handle Enter Key ---
      editor.registerCommand(
        INSERT_PARAGRAPH_COMMAND,
        () => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
            return false;
          }

          const anchorNode = selection.anchor.getNode();
          const topLevelNode = anchorNode.getTopLevelElement();
          const root = $getRoot();
          const firstChild = root.getFirstChild();

          // Check if Enter is pressed within the *first* H1 node
          if (
            $isHeadingNode(topLevelNode) &&
            topLevelNode.getTag() === 'h1' && 
            firstChild === topLevelNode // Ensure it's the very first element
          ) {
            // Scenario: Pressing Enter at the *end* of the first H1
            if (selection.anchor.offset === topLevelNode.getTextContentSize()) {
              editor.update(() => {
                const paragraph = $createParagraphNode();
                topLevelNode.insertAfter(paragraph);
                // Select the new paragraph and clear its format
                const newSelection = paragraph.selectStart(); // Select the start of the new paragraph
                newSelection.format = 0; // Clear format (remove bold)
                $setSelection(newSelection);
              });
              return true; // Command handled
            }

            // Scenario: Pressing Enter on an *empty* H1 - convert to paragraph
            if (topLevelNode.isEmpty()) {
              editor.update(() => {
                const paragraph = $createParagraphNode();
                topLevelNode.replace(paragraph);
                paragraph.select(); // Select the new empty paragraph
              });
              return true; // Command handled
            }

            // Scenario: Pressing Enter *within* the H1 - let default behavior split it
            // We might want to ensure the *new* H1 created by the split isn't bold?
            // For now, let default split handle it.
            return false;
          }

          // Default behavior for Enter elsewhere
          return false;
        },
        COMMAND_PRIORITY_HIGH
      ),

      // --- Optional: Handle Backspace/Delete to potentially revert to H1 ---
      // This part is more complex and might need refinement based on exact desired behavior
      editor.registerCommand(
         DELETE_CHARACTER_COMMAND,
         (isBackward: boolean) => {
              const selection = $getSelection();
              if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
                  return false;
              }

              const anchorNode = selection.anchor.getNode();
              const topLevelElement = anchorNode.getTopLevelElement();
              const root = $getRoot();

              // Check if backspace happens at the beginning of the *second* element,
              // which is a paragraph, and the first element is an H1.
              if (
                 isBackward &&
                 selection.anchor.offset === 0 &&
                 $isElementNode(topLevelElement) &&
                 topLevelElement.getPreviousSibling() !== null && // It's not the first element
                 $isHeadingNode(topLevelElement.getPreviousSibling()) && // The one before IS H1
                 topLevelElement.getPreviousSibling()?.getPreviousSibling() === null // The H1 is the very first
              ) {
                 // Potentially merge the paragraph back into the H1, or just delete the paragraph
                 // Allowing default behavior might be sufficient here if it merges blocks correctly.
                 // Let's return false for now to see default behavior. More complex logic could go here.
                 return false;
              }

              // Check if the editor might become completely empty after deletion
              // If the root will be empty after this delete, reset to H1
              // This needs careful state checking *before* the deletion happens, which is tricky.
              // An alternative is using the OnChangePlugin for this.

              return false; // Default backspace behavior
         },
         COMMAND_PRIORITY_HIGH
      ),

       // --- Alternative/Supplement: Use OnChange to enforce H1 when empty ---
       editor.registerUpdateListener(({ editorState }) => {
           editorState.read(() => {
             const root = $getRoot();
             const firstChild = root.getFirstChild();

             // If root is empty OR only contains one empty paragraph, force H1
             if (root.isEmpty() || (root.getChildrenSize() === 1 && firstChild?.isEmpty() && !$isHeadingNode(firstChild))) {
                // Avoid infinite loops by checking if already inside an update
                 if (!editor._updating) {
                     editor.update(() => {
                         root.clear();
                         const heading = $createHeadingNode('h1');
                         root.append(heading);
                         // Only select if editor has focus to avoid grabbing focus unexpectedly
                         if (editor.getRootElement()?.contains(document.activeElement)) {
                             heading.select();
                         }
                     });
                 }
             }
           });
       })

    ); // end mergeRegister

    return () => {
      unregister(); // Cleanup listeners on unmount
    };
  }, [editor]);

  return null;
}

export default DynamicTitlePlugin;