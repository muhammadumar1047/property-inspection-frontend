import React, { forwardRef } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

interface RTFEditorProps {
  value: string;
  onChange: (content: string) => void;
  style?: React.CSSProperties;
  modules?: any;
  theme?: string;
}

const RTFEditor = forwardRef<ReactQuill, RTFEditorProps>((props, ref) => (
  <ReactQuill {...props} ref={ref} />
));

RTFEditor.displayName = 'RTFEditor';

export default RTFEditor;
