import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from '@tiptap/react';

function ProcessStepComponent({ node }: { node: any }) {
  const stepNumber = node.attrs.stepNumber || 1;
  
  return (
    <NodeViewWrapper>
      <div className="flex gap-4 my-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold">
          {stepNumber}
        </div>
        <div className="flex-1">
          <NodeViewContent />
        </div>
      </div>
    </NodeViewWrapper>
  );
}

export const ProcessStep = Node.create({
  name: 'processStep',
  group: 'block',
  content: 'block+',

  addAttributes() {
    return {
      stepNumber: {
        default: 1,
        parseHTML: (element) => parseInt(element.getAttribute('data-step') || '1'),
        renderHTML: (attributes) => ({
          'data-step': attributes.stepNumber,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-process-step]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-process-step': '' }, HTMLAttributes), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ProcessStepComponent);
  },
});
