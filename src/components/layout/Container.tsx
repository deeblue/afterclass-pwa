import type { PropsWithChildren, HTMLAttributes } from "react";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/** 頁面通用容器：限制寬度、設定左右 padding */
export default function Container({
  className,
  children,
  ...rest
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      className={cx("mx-auto w-full max-w-5xl px-4 md:px-6", className)}
      {...rest}
    >
      {children}
    </div>
  );
}
