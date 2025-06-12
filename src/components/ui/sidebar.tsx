
"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { VariantProps, cva } from "class-variance-authority"
import { PanelLeft, X } from "lucide-react"
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"


const SIDEBAR_WIDTH = "var(--sidebar-width, 16rem)"
const SIDEBAR_WIDTH_ICON = "var(--sidebar-width-icon, 3.75rem)"
const SIDEBAR_WIDTH_MOBILE = "var(--sidebar-width-mobile, 16rem)"


type SidebarContextType = {
  isDesktopCollapsed: boolean;
  toggleDesktopCollapse: () => void;
  isMobileSheetOpen: boolean;
  setIsMobileSheetOpen: (open: boolean) => void;
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
    initialDesktopCollapsed?: boolean;
    onDesktopCollapseChange?: (collapsed: boolean) => void;
  }
>(
  (
    {
      className,
      style,
      children,
      initialDesktopCollapsed = false,
      onDesktopCollapseChange,
      ...props
    },
    ref
  ) => {
    const [isDesktopCollapsed, setIsDesktopCollapsed] = React.useState(initialDesktopCollapsed);
    const [isMobileSheetOpen, setIsMobileSheetOpen] = React.useState(false);

    const toggleDesktopCollapse = React.useCallback(() => {
      setIsDesktopCollapsed(prev => {
        const newState = !prev;
        onDesktopCollapseChange?.(newState);
        return newState;
      });
    }, [onDesktopCollapseChange]);
    
    React.useEffect(() => {
        setIsDesktopCollapsed(initialDesktopCollapsed);
    }, [initialDesktopCollapsed]);

    const contextValue = React.useMemo<SidebarContextType>(
      () => ({
        isDesktopCollapsed,
        toggleDesktopCollapse,
        isMobileSheetOpen,
        setIsMobileSheetOpen,
      }),
      [isDesktopCollapsed, toggleDesktopCollapse, isMobileSheetOpen, setIsMobileSheetOpen]
    );

    return (
      <SidebarContext.Provider value={contextValue}>
        <TooltipProvider delayDuration={100}>
          <div
            style={
              {
                "--sidebar-width": SIDEBAR_WIDTH,
                "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
                "--sidebar-width-mobile": SIDEBAR_WIDTH_MOBILE,
                ...style,
              } as React.CSSProperties
            }
            className={cn(
              "group/sidebar-wrapper flex min-h-svh w-full",
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
  HTMLElement,
  React.ComponentProps<"aside">
>(
  (
    {
      className,
      children,
      ...props
    },
    ref
  ) => {
    const { isDesktopCollapsed } = useSidebar();
    return (
      <aside
        ref={ref}
        className={cn(
          "bg-sidebar text-sidebar-foreground flex-col h-screen sticky top-0 z-30", 
          "flex-shrink-0 border-r border-sidebar-border transition-[width] duration-300 ease-in-out", 
          isDesktopCollapsed ? "w-[var(--sidebar-width-icon)]" : "w-[var(--sidebar-width)]",
          "hidden md:flex", 
          className
        )}
        data-state={isDesktopCollapsed ? "collapsed" : "expanded"}
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

const MobileSheetSidebar = ({ children }: { children: React.ReactNode }) => {
    const { isMobileSheetOpen, setIsMobileSheetOpen } = useSidebar();
    return (
        <Sheet open={isMobileSheetOpen} onOpenChange={setIsMobileSheetOpen}>
            <SheetContent side="left" className="md:hidden w-[var(--sidebar-width-mobile)] p-0 overflow-y-auto">
                 <SheetHeader className="p-0 border-b">
                    {/* Removed SheetTitle as AppSidebar might have its own visual header logic,
                        and sr-only title is now in AppSidebar. This ensures no visual title here if AppSidebar manages it. */}
                 </SheetHeader>
                <div className="flex flex-col h-full">
                    {children}
                </div>
            </SheetContent>
        </Sheet>
    );
};


const SidebarTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button>
>(({ className, onClick, children, ...props }, ref) => {
  const { toggleDesktopCollapse } = useSidebar();
  const isMobile = useIsMobile();

  if (isMobile) return null; 

  return (
    <Button
      ref={ref}
      data-sidebar="trigger" 
      variant="ghost"
      size="icon"
      className={cn("h-7 w-7", className)} 
      onClick={(e) => {
        toggleDesktopCollapse();
        onClick?.(e);
      }}
      {...props}
    >
      {children || <PanelLeft />}
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
});
SidebarTrigger.displayName = "SidebarTrigger";


const SidebarRail = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button">
>(({ className, ...props }, ref) => {
  return (
    <button
      ref={ref}
      data-sidebar="rail"
      aria-label="Toggle Sidebar"
      tabIndex={-1}
      title="Toggle Sidebar"
      className={cn("hidden", className)}
      {...props}
    />
  )
})
SidebarRail.displayName = "SidebarRail"

const SidebarInset = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "flex-1 flex flex-col bg-background overflow-y-auto overflow-x-hidden w-full min-w-0", // Added w-full, min-w-0, overflow-x-hidden
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
        "h-8 w-full bg-input text-foreground shadow-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground", 
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
      className={cn("flex flex-col gap-2", className)}
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
      className={cn("flex flex-col gap-2 mt-auto", className)}
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
      className={cn("bg-sidebar-border", className)} 
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
        "flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden text-sidebar-foreground", 
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
  return (
    <Comp
      ref={ref}
      data-sidebar="group-label"
      className={cn(
        "flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70 outline-none ring-ring focus-visible:ring-1 [&>svg]:size-4 [&>svg]:shrink-0", 
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
  return (
    <Comp
      ref={ref}
      data-sidebar="group-action"
      className={cn(
        "absolute right-3 top-3.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground/70 outline-none ring-ring transition-transform hover:bg-sidebar-hover hover:text-sidebar-hover-foreground focus-visible:ring-1 [&>svg]:size-4 [&>svg]:shrink-0", 
        "after:absolute after:-inset-2 after:md:hidden",
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
  "peer/menu-button flex w-full items-center gap-2.5 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-ring transition-[width,height,padding] hover:bg-sidebar-hover hover:text-sidebar-hover-foreground focus-visible:ring-1 active:bg-sidebar-active/80 disabled:pointer-events-none disabled:opacity-50 group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-active data-[active=true]:text-sidebar-active-foreground data-[active=true]:font-medium data-[state=open]:hover:bg-sidebar-hover", 
  {
    variants: {
      variant: {
        default: "text-sidebar-foreground", 
      },
      size: {
        default: "h-9 text-sm px-2.5",
        sm: "h-8 text-xs px-2",
        lg: "h-10 text-sm px-3",
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
    tooltip?: string | React.ReactNode; 
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
    const { isDesktopCollapsed } = useSidebar();

    const content = (
      <Comp
        ref={ref}
        data-sidebar="menu-button"
        data-size={size}
        data-active={isActive}
        data-sidebar-state={isDesktopCollapsed ? "collapsed" : "expanded"}
        className={cn(sidebarMenuButtonVariants({ variant, size, className }))}
        {...props}
      >
        {children}
      </Comp>
    );

    if (tooltip && isDesktopCollapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right" align="center" className="ml-1">
            {typeof tooltip === 'string' ? <p>{tooltip}</p> : tooltip}
          </TooltipContent>
        </Tooltip>
      );
    }
    return content;
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
  return (
    <Comp
      ref={ref}
      data-sidebar="menu-action"
      className={cn(
        "absolute right-1 top-1/2 -translate-y-1/2 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground/70 outline-none ring-ring transition-transform hover:bg-sidebar-hover hover:text-sidebar-hover-foreground focus-visible:ring-1 peer-hover/menu-button:text-sidebar-hover-foreground [&>svg]:size-4 [&>svg]:shrink-0", 
        "after:absolute after:-inset-2 after:md:hidden",
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
  return (
  <div
    ref={ref}
    data-sidebar="menu-badge"
    className={cn(
      "ml-auto flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-xs font-medium tabular-nums text-background bg-sidebar-foreground select-none pointer-events-none", 
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
          className="size-4 rounded-sm shrink-0 bg-sidebar-foreground/30" 
          data-sidebar="menu-skeleton-icon"
        />
      )}
      <Skeleton
        className="h-4 flex-1 max-w-[--skeleton-width] bg-sidebar-foreground/30" 
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
  return (
  <ul
    ref={ref}
    data-sidebar="menu-sub"
    className={cn(
      "mx-[calc(theme(spacing.2)_+_9px)] flex min-w-0 translate-x-px flex-col gap-0.5 border-l border-sidebar-border py-0.5 pl-2.5", 
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
  HTMLAnchorElement,
  React.ComponentProps<"a"> & {
    asChild?: boolean
    size?: "sm" | "default"
    isActive?: boolean
  }
>(({ asChild = false, size = "default", isActive, className, ...props }, ref) => {
  const Comp = asChild ? Slot : "a"
  return (
    <Comp
      ref={ref}
      data-sidebar="menu-sub-button"
      data-size={size}
      data-active={isActive}
      className={cn(
        "flex min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-sidebar-foreground outline-none ring-ring hover:bg-sidebar-hover hover:text-sidebar-hover-foreground focus-visible:ring-1 active:bg-sidebar-active/80 active:text-sidebar-active-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-sidebar-foreground", 
        "data-[active=true]:bg-sidebar-active data-[active=true]:text-sidebar-active-foreground",
        size === "sm" && "h-8 text-xs",
        size === "default" && "h-9 text-sm",
        className
      )}
      {...props}
    />
  )
})
SidebarMenuSubButton.displayName = "SidebarMenuSubButton"

export {
  MobileSheetSidebar, 
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
