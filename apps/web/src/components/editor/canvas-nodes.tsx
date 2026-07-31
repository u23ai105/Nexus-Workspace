import { Handle, Position, type NodeProps } from '@xyflow/react';

// Sticky Note
export const StickyNode = ({ data }: NodeProps) => {
  return (
    <div className="nexus-node-sticky p-4 min-w-[200px] min-h-[200px] relative">
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-indigo-500" />
      <div className="text-lg leading-relaxed whitespace-pre-wrap">{data.text as string || 'Double click to edit...'}</div>
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-indigo-500" />
    </div>
  );
};

// Image Node
export const ImageNode = ({ data }: NodeProps) => {
  return (
    <div className="nexus-node-image min-w-[200px] min-h-[150px] relative rounded-lg border-2 border-transparent hover:border-indigo-400 transition-colors">
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-indigo-500" />
      <img src={data.url as string || 'https://via.placeholder.com/300x200?text=Image'} alt="Canvas Node" className="w-full h-full object-cover rounded-md pointer-events-none" />
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-indigo-500" />
    </div>
  );
};

// Text Node (Card)
export const TextNode = ({ data }: NodeProps) => {
  return (
    <div className="nexus-node min-w-[250px] relative">
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-indigo-500" />
      <div className="font-semibold mb-2 border-b border-slate-200 dark:border-slate-700 pb-2">
        {data.title as string || 'Text Node'}
      </div>
      <div className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
        {data.text as string || 'Enter your text here...'}
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-indigo-500" />
    </div>
  );
};

export const nodeTypes = {
  stickyNode: StickyNode,
  imageNode: ImageNode,
  textNode: TextNode,
};
