import { forwardRef, type AnchorHTMLAttributes } from "react";
import { navigate } from "./navigation";

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { href: string; scroll?: boolean; prefetch?: boolean; replace?: boolean };

const Link = forwardRef<HTMLAnchorElement, Props>(function Link({ href, scroll, prefetch: _p, replace, onClick, ...rest }, ref) {
  return (
    <a
      ref={ref}
      href={import.meta.env.VITE_ROUTER === "hash" ? `#${href}` : href}
      {...rest}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        navigate(href, !!replace, scroll !== false);
      }}
    />
  );
});

export default Link;
