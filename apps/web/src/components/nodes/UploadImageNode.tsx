"use client";
import { memo } from "react";
import { NodeProps } from "@xyflow/react";
import { Image as ImageIcon } from "lucide-react";
import BaseNode from "./BaseNode";
import UploadDropzone from "./UploadDropzone";

export default memo(function UploadImageNode({ id, data, selected }: NodeProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- node data shape is heterogeneous across node types
  const d = data as any;
  return (
    <BaseNode id={id} type="upload-image" label={d.label || "Upload Image"} icon={<ImageIcon size={13} />} isRunning={d.isRunning} runStatus={d.runStatus} runError={d.runError} selected={selected}>
      <UploadDropzone id={id} kind="image" data={d} />
    </BaseNode>
  );
});
