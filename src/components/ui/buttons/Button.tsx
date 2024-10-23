import React from "react";

import { cn } from "../../../utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export const Button: React.FC<ButtonProps> = (props) => {
  return (
    <button
      {...props}
      className={cn("p-[10px]", props.className)}
    >
      {props.children}
    </button>
  );
};