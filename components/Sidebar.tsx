"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
    collapsible?: "none" | "hover" | "click"
    rooms: { id: string; name: string; lastMessage: string }[]
    selectedRoomId: string | null
    onRoomSelect: (roomId: string) => void
    onProfileClick: () => void
    onRoomSettingsClick: () => void
}

const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
    ({ className, collapsible = "none", rooms, selectedRoomId, onRoomSelect, onProfileClick, onRoomSettingsClick, ...props }, ref) => {
        const [collapsed, setCollapsed] = React.useState(false)

        return (
            <div
                ref={ref}
                className={cn(
                    "flex h-full w-64 flex-col bg-background transition-all duration-300",
                    collapsed && "w-16",
                    collapsible === "hover" && "hover:w-64",
                    className,
                )}
                onMouseEnter={() => collapsible === "hover" && setCollapsed(false)}
                onMouseLeave={() => collapsible === "hover" && setCollapsed(true)}
                {...props}
            >
                <SidebarHeader>
                    <button onClick={onProfileClick}>Profile</button>
                </SidebarHeader>
                <SidebarContent>
                    <SidebarMenu>
                        {rooms.map(room => (
                            <SidebarMenuItem key={room.id}>
                                <SidebarMenuButton isActive={selectedRoomId === room.id} onClick={() => onRoomSelect(room.id)}>
                                    {room.name}
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarContent>
                <SidebarFooter>
                    <button onClick={onRoomSettingsClick}>Room Settings</button>
                </SidebarFooter>
            </div>
        )
    },
)
Sidebar.displayName = "Sidebar"

const SidebarHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={cn("flex h-14 items-center px-4", className)} {...props} />
    ),
)
SidebarHeader.displayName = "SidebarHeader"

const SidebarContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => <div ref={ref} className={cn("flex-1 overflow-auto", className)} {...props} />,
)
SidebarContent.displayName = "SidebarContent"

const SidebarFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={cn("flex h-14 items-center px-4", className)} {...props} />
    ),
)
SidebarFooter.displayName = "SidebarFooter"

const SidebarRail = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div
            ref={ref}
            className={cn("absolute right-0 top-0 h-full w-1 cursor-col-resize bg-border", className)}
            {...props}
        />
    ),
)
SidebarRail.displayName = "SidebarRail"

const SidebarInset = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => <div ref={ref} className={cn("flex flex-1 flex-col", className)} {...props} />,
)
SidebarInset.displayName = "SidebarInset"

const SidebarMenu = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => <div ref={ref} className={cn("space-y-1", className)} {...props} />,
)
SidebarMenu.displayName = "SidebarMenu"

const SidebarMenuItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => <div ref={ref} className={cn("px-2", className)} {...props} />,
)
SidebarMenuItem.displayName = "SidebarMenuItem"

const SidebarMenuButton = React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement> & {
        isActive?: boolean
    }
>(({ className, isActive, ...props }, ref) => (
    <button
        ref={ref}
        className={cn(
            "flex w-full items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
            isActive && "bg-accent text-accent-foreground",
            className,
        )}
        {...props}
    />
))
SidebarMenuButton.displayName = "SidebarMenuButton"

const SidebarGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => <div ref={ref} className={cn("py-2", className)} {...props} />,
)
SidebarGroup.displayName = "SidebarGroup"

const SidebarGroupLabel = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={cn("px-2 py-1 text-xs font-medium text-muted-foreground", className)} {...props} />
    ),
)
SidebarGroupLabel.displayName = "SidebarGroupLabel"

const SidebarGroupContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => <div ref={ref} className={cn("space-y-1", className)} {...props} />,
)
SidebarGroupContent.displayName = "SidebarGroupContent"

const SidebarSeparator = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => <div ref={ref} className={cn("mx-2 my-1 h-px bg-border", className)} {...props} />,
)
SidebarSeparator.displayName = "SidebarSeparator"

export {
    Sidebar,
    SidebarHeader,
    SidebarContent,
    SidebarFooter,
    SidebarRail,
    SidebarInset,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarGroupContent,
    SidebarSeparator,
}