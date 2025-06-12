
"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { VariantProps, cva } from "class-variance-authority"
import { PanelLeft } from "lucide-react"

import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// Cookie handling removed for simplicity in this context.
// Sidebar state will be controlled by the `open` prop passed to SidebarProvider.
const SIDEBAR_WIDTH = "var(--sidebar-width, 16rem)"
const SIDEBAR_WIDTH_ICON = "var(--sidebar-width-icon, 3.75rem)"
const SIDEBAR_WIDTH_MOBILE = "var(--sidebar-width-mobile, 16rem)" // Kept for completeness, but not used in this simplified layout
const SIDEBAR_KEYBOARD_SHORTCUT = "b"


type SidebarContextType = {
  state: "expanded" | "collapsed" // Derived from `open`
  open: boolean // Directly controlled by SidebarProvider's `open` prop
  setOpen: (open: boolean) => void // Provided by SidebarProvider's `onOpenChange`
  openMobile: boolean // Not used in this simplified layout
  setOpenMobile: (open: boolean) => void // Not used
  isMobile: boolean // Not used
  toggleSidebar: () => void // Calls setOpen
}

const SidebarContext = React.createContext<SidebarContextType | null>(null)

function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.")
  }
  return context
}

const SidebarProvider = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    open: boolean // Made 'open' a required, controlled prop
    onOpenChange: (open: boolean) => void // Required for control
  }
>(
  (
    {
      open, // Controlled prop
      onOpenChange, // Controlled prop
      className,
      style,
      children,
      ...props
    },
    ref
  ) => {
    // isMobile and openMobile logic is removed as we are forcing desktop layout
    const isMobile = false; // Forcing desktop context
    const openMobile = false; // Not used

    const setOpen = React.useCallback(
      (value: boolean | ((current: boolean) => boolean)) => {
        const newState = typeof value === "function" ? value(open) : value;
        onOpenChange(newState);
      },
      [open, onOpenChange]
    );
    
    const toggleSidebar = React.useCallback(() => {
      setOpen(!open);
    }, [open, setOpen]);

    // Keyboard shortcut effect can be kept if desired, but ensure it calls the controlled setOpen
    React.useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          toggleSidebar();
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [toggleSidebar]);

    const state = open ? "expanded" : "collapsed";

    const contextValue = React.useMemo<SidebarContextType>(
      () => ({
        state,
        open,
        setOpen,
        isMobile, // Will be false
        openMobile, // Will be false
        setOpenMobile: () => {}, // No-op for mobile
        toggleSidebar,
      }),
      [state, open, setOpen, toggleSidebar]
    );

    return (
      <SidebarContext.Provider value={contextValue}>
        <TooltipProvider delayDuration={100}>
          <div
            style={
              {
                "--sidebar-width": SIDEBAR_WIDTH,
                "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
                "--sidebar-width-mobile": SIDEBAR_WIDTH_MOBILE, // Still provided for completeness
                ...style,
              } as React.CSSProperties
            }
            className={cn(
              "group/sidebar-wrapper flex min-h-svh w-full", // Basic flex container
              className
            )}
            ref={ref}
            {...props}
          >
            {children}
          </div>
        </TooltipProvider>
      </SidebarContext.Provider>
    )
  }
)
SidebarProvider.displayName = "SidebarProvider"

const Sidebar = React.forwardRef<
  HTMLElement, // Changed to HTMLElement for <aside>
  React.ComponentProps<"aside"> // Using <aside> for semantic HTML
>(
  (
    {
      className,
      children,
      ...props
    },
    ref
  ) => {
    const { open } = useSidebar(); // Use 'open' directly from context

    return (
      <aside
        ref={ref}
        className={cn(
          "flex flex-col h-screen sticky top-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-[width] duration-200 ease-linear",
          // Width is determined by the 'open' prop from SidebarProvider
          open ? "w-[var(--sidebar-width)]" : "w-[var(--sidebar-width-icon)]",
          className
        )}
        data-state={open ? "expanded" : "collapsed"}
        {...props}
      >
        <div
          data-sidebar="sidebar-inner-content"
          className="flex h-full w-full flex-col overflow-hidden"
        >
          {children}
        </div>
      </aside>
    )
  }
)
Sidebar.displayName = "Sidebar"


// SidebarTrigger and SidebarRail are primarily for dynamic toggling, which we've simplified.
// They can be kept if a manual toggle button is desired on desktop later.
const SidebarTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button>
>(({ className, onClick, children, asChild, ...props }, ref) => {
  const { toggleSidebar } = useSidebar();

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (onClick) {
      onClick(event);
    }
    toggleSidebar();
  };

  if (asChild) {
    if (!React.isValidElement(children)) {
      console.error("SidebarTrigger with asChild expects a single React element child.");
      return null;
    }
    const childElement = React.Children.only(children) as React.ReactElement<React.ButtonHTMLAttributes<HTMLButtonElement>>;
    return React.cloneElement(childElement, {
      ref,
      onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
        if (childElement.props.onClick) {
          childElement.props.onClick(e);
        }
        handleClick(e);
      },
      className: cn(childElement.props.className, className),
      ...props,
    });
  }

  return (
    <Button
      ref={ref}
      data-sidebar="trigger"
      variant="ghost"
      size="icon"
      className={cn("h-7 w-7", className)}
      onClick={handleClick}
      {...props}
    >
      <PanelLeft />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
});
SidebarTrigger.displayName = "SidebarTrigger";


const SidebarRail = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button">
>(({ className, ...props }, ref) => {
  const { toggleSidebar } = useSidebar()

  return (
    <button
      ref={ref}
      data-sidebar="rail"
      aria-label="Toggle Sidebar"
      tabIndex={-1}
      onClick={toggleSidebar}
      title="Toggle Sidebar"
      className={cn( // Simplified rail styling
        "absolute inset-y-0 z-20 w-4 -translate-x-1/2 transition-all ease-linear after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] hover:after:bg-border flex",
        "[[data-side=left]_&]:cursor-w-resize [[data-side=right]_&]:cursor-e-resize",
        "[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize",
        className
      )}
      {...props}
    />
  )
})
SidebarRail.displayName = "SidebarRail"

const SidebarInset = React.forwardRef<
  HTMLDivElement, // Changed to HTMLDivElement, it's a general content wrapper
  React.ComponentProps<"div">
>(({ className, children, ...props }, ref) => {
  return (
    <div // Using a simple div, could be <main> if it's the primary content
      ref={ref}
      className={cn(
        "flex-1 flex flex-col overflow-y-auto bg-background", // flex-1 is key, overflow for scrolling
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})
SidebarInset.displayName = "SidebarInset"

const SidebarInput = React.forwardRef<
  React.ElementRef<typeof Input>,
  React.ComponentProps<typeof Input>
>(({ className, ...props }, ref) => {
  return (
    <Input
      ref={ref}
      data-sidebar="input"
      className={cn(
        "h-8 w-full bg-background shadow-none focus-visible:ring-1 focus-visible:ring-ring",
        className
      )}
      {...props}
    />
  )
})
SidebarInput.displayName = "SidebarInput"

const SidebarHeader = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="header"
      className={cn("flex flex-col gap-2 p-2", className)} // Standard padding, AppSidebar will manage internal spacing
      {...props}
    />
  )
})
SidebarHeader.displayName = "SidebarHeader"

const SidebarFooter = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="footer"
      className={cn("flex flex-col gap-2 p-2 mt-auto", className)} // Standard padding
      {...props}
    />
  )
})
SidebarFooter.displayName = "SidebarFooter"

const SidebarSeparator = React.forwardRef<
  React.ElementRef<typeof Separator>,
  React.ComponentProps<typeof Separator>
>(({ className, ...props }, ref) => {
  return (
    <Separator
      ref={ref}
      data-sidebar="separator"
      className={cn("mx-2 w-auto bg-border", className)} // Consistent with AppSidebar's p-2
      {...props}
    />
  )
})
SidebarSeparator.displayName = "SidebarSeparator"

const SidebarContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="content"
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden p-2", // Standard padding
        "group-data-[collapsible=icon]:group-data-[state=collapsed]:overflow-hidden",
        className
      )}
      {...props}
    />
  )
})
SidebarContent.displayName = "SidebarContent"

const SidebarGroup = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="group"
      className={cn("relative flex w-full min-w-0 flex-col p-0", className)}
      {...props}
    />
  )
})
SidebarGroup.displayName = "SidebarGroup"

const SidebarGroupLabel = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & { asChild?: boolean }
>(({ className, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "div"
  const { open } = useSidebar();

  return (
    <Comp
      ref={ref}
      data-sidebar="group-label"
      className={cn(
        "duration-200 flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-muted-foreground outline-none ring-ring transition-[margin,opacity] ease-linear focus-visible:ring-1 [&>svg]:size-4 [&>svg]:shrink-0",
        !open && "group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0", // Adjusted condition based on 'open'
        className
      )}
      {...props}
    />
  )
})
SidebarGroupLabel.displayName = "SidebarGroupLabel"

const SidebarGroupAction = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & { asChild?: boolean }
>(({ className, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  const { open } = useSidebar();

  return (
    <Comp
      ref={ref}
      data-sidebar="group-action"
      className={cn(
        "absolute right-3 top-3.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-muted-foreground outline-none ring-ring transition-transform hover:bg-accent hover:text-accent-foreground focus-visible:ring-1 [&>svg]:size-4 [&>svg]:shrink-0",
        "after:absolute after:-inset-2 after:md:hidden",
        !open && "group-data-[collapsible=icon]:hidden", // Adjusted
        className
      )}
      {...props}
    />
  )
})
SidebarGroupAction.displayName = "SidebarGroupAction"

const SidebarGroupContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-sidebar="group-content"
    className={cn("w-full text-sm", className)}
    {...props}
  />
))
SidebarGroupContent.displayName = "SidebarGroupContent"

const SidebarMenu = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul">
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    data-sidebar="menu"
    className={cn("flex w-full min-w-0 flex-col gap-0.5", className)}
    {...props}
  />
))
SidebarMenu.displayName = "SidebarMenu"

const SidebarMenuItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<"li">
>(({ className, ...props }, ref) => (
  <li
    ref={ref}
    data-sidebar="menu-item"
    className={cn("group/menu-item relative", className)}
    {...props}
  />
))
SidebarMenuItem.displayName = "SidebarMenuItem"

const sidebarMenuButtonVariants = cva(
  "peer/menu-button flex w-full items-center gap-2.5 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-ring transition-[width,height,padding] hover:bg-sidebar-hover hover:text-sidebar-hover-foreground focus-visible:ring-1 active:bg-sidebar-active active:text-sidebar-active-foreground disabled:pointer-events-none disabled:opacity-50 group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-active data-[active=true]:font-medium data-[active=true]:text-sidebar-active-foreground data-[state=open]:hover:bg-sidebar-hover data-[state=open]:hover:text-sidebar-hover-foreground",
  // Collapsed state styling for icon-only buttons
  "data-[sidebar-state=collapsed]:group-data-[collapsible=icon]:size-9 data-[sidebar-state=collapsed]:group-data-[collapsible=icon]:p-2 data-[sidebar-state=collapsed]:group-data-[collapsible=icon]:justify-center",
  {
    variants: {
      variant: {
        default: "text-sidebar-foreground",
      },
      size: {
        default: "h-9 text-sm px-2.5",
        sm: "h-8 text-xs px-2",
        lg: "h-10 text-sm px-3 data-[sidebar-state=collapsed]:group-data-[collapsible=icon]:!size-10 data-[sidebar-state=collapsed]:group-data-[collapsible=icon]:!p-2.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const SidebarMenuButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & {
    asChild?: boolean
    isActive?: boolean
    tooltip?: string | React.ComponentProps<typeof TooltipContent> | { content: React.ReactNode; side?: "top" | "right" | "bottom" | "left"; align?: "start" | "center" | "end"; className?: string };
  } & VariantProps<typeof sidebarMenuButtonVariants>
>(
  (
    {
      asChild = false,
      isActive = false,
      variant = "default",
      size = "default",
      tooltip,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button"
    const { open } = useSidebar() // Using 'open' from context

    const buttonContent = (
      <Comp
        ref={ref}
        data-sidebar="menu-button"
        data-size={size}
        data-active={isActive}
        // Add data-sidebar-state for specific collapsed styling
        data-sidebar-state={open ? "expanded" : "collapsed"}
        className={cn(sidebarMenuButtonVariants({ variant, size, className }))}
        {...props}
      >
        {children}
      </Comp>
    )

    // Show tooltip only when sidebar is collapsed AND a tooltip is provided
    if (!open && tooltip) {
      let tooltipProps: React.ComponentProps<typeof TooltipContent> = {};
      if (typeof tooltip === "string") {
        tooltipProps = { children: tooltip };
      } else if (tooltip && 'content' in tooltip) {
        tooltipProps = { children: tooltip.content, side: tooltip.side, align: tooltip.align, className: tooltip.className };
      } else {
        tooltipProps = tooltip as React.ComponentProps<typeof TooltipContent>;
      }

      return (
        <Tooltip>
          <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
          <TooltipContent
            side={tooltipProps.side || "right"}
            align={tooltipProps.align || "center"}
            {...tooltipProps}
          />
        </Tooltip>
      )
    }
    
    return buttonContent;
  }
)
SidebarMenuButton.displayName = "SidebarMenuButton"

const SidebarMenuAction = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & {
    asChild?: boolean
    showOnHover?: boolean
  }
>(({ className, asChild = false, showOnHover = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  const { open } = useSidebar();

  return (
    <Comp
      ref={ref}
      data-sidebar="menu-action"
      className={cn(
        "absolute right-1 top-1/2 -translate-y-1/2 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-muted-foreground outline-none ring-ring transition-transform hover:bg-accent hover:text-accent-foreground focus-visible:ring-1 peer-hover/menu-button:text-accent-foreground [&>svg]:size-4 [&>svg]:shrink-0",
        "after:absolute after:-inset-2 after:md:hidden",
        !open && "group-data-[collapsible=icon]:hidden", // Adjusted
        showOnHover &&
          "group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100 peer-data-[active=true]/menu-button:text-accent-foreground md:opacity-0",
        className
      )}
      {...props}
    />
  )
})
SidebarMenuAction.displayName = "SidebarMenuAction"

const SidebarMenuBadge = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  const { open } = useSidebar();
  return (
  <div
    ref={ref}
    data-sidebar="menu-badge"
    className={cn(
      "absolute right-1 top-1/2 -translate-y-1/2 flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-xs font-medium tabular-nums text-foreground select-none pointer-events-none",
      "peer-hover/menu-button:text-accent-foreground peer-data-[active=true]/menu-button:text-accent-foreground",
      !open && "group-data-[collapsible=icon]:hidden", // Adjusted
      className
    )}
    {...props}
  />
)})
SidebarMenuBadge.displayName = "SidebarMenuBadge"

const SidebarMenuSkeleton = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    showIcon?: boolean
  }
>(({ className, showIcon = false, ...props }, ref) => {
  const width = React.useMemo(() => {
    return `${Math.floor(Math.random() * 40) + 50}%`
  }, [])

  return (
    <div
      ref={ref}
      data-sidebar="menu-skeleton"
      className={cn("rounded-md h-9 flex gap-2.5 px-2.5 items-center", className)}
      {...props}
    >
      {showIcon && (
        <Skeleton
          className="size-4 rounded-sm shrink-0"
          data-sidebar="menu-skeleton-icon"
        />
      )}
      <Skeleton
        className="h-4 flex-1 max-w-[--skeleton-width]"
        data-sidebar="menu-skeleton-text"
        style={
          {
            "--skeleton-width": width,
          } as React.CSSProperties
        }
      />
    </div>
  )
})
SidebarMenuSkeleton.displayName = "SidebarMenuSkeleton"

const SidebarMenuSub = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul">
>(({ className, ...props }, ref) => {
  const { open } = useSidebar();
  return (
  <ul
    ref={ref}
    data-sidebar="menu-sub"
    className={cn(
      "mx-[calc(theme(spacing.2)_+_9px)] flex min-w-0 translate-x-px flex-col gap-0.5 border-l border-border py-0.5 pl-2.5",
      !open && "group-data-[collapsible=icon]:hidden", // Adjusted
      className
    )}
    {...props}
  />
)})
SidebarMenuSub.displayName = "SidebarMenuSub"

const SidebarMenuSubItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<"li">
>(({ ...props }, ref) => <li ref={ref} {...props} />)
SidebarMenuSubItem.displayName = "SidebarMenuSubItem"

const SidebarMenuSubButton = React.forwardRef<
  HTMLAnchorElement, // Assuming it's an anchor, but can be button too
  React.ComponentProps<"a"> & { // Or React.ComponentProps<"button">
    asChild?: boolean
    size?: "sm" | "default"
    isActive?: boolean
  }
>(({ asChild = false, size = "default", isActive, className, ...props }, ref) => {
  const Comp = asChild ? Slot : "a" // Or "button"
  const { open } = useSidebar();

  return (
    <Comp
      ref={ref}
      data-sidebar="menu-sub-button"
      data-size={size}
      data-active={isActive}
      className={cn(
        "flex min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-foreground outline-none ring-ring hover:bg-accent hover:text-accent-foreground focus-visible:ring-1 active:bg-accent active:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-accent-foreground",
        "data-[active=true]:bg-accent data-[active=true]:text-accent-foreground",
        size === "sm" && "h-8 text-xs",
        size === "default" && "h-9 text-sm",
        !open && "group-data-[collapsible=icon]:hidden", // Adjusted
        className
      )}
      {...props}
    />
  )
})
SidebarMenuSubButton.displayName = "SidebarMenuSubButton"

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
}
