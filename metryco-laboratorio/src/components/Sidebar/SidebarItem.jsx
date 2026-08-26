import {
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
} from "@mui/material";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";

export default function SidebarItem({ item }) {
  const location = useLocation();
  const hasChildren = item.children && item.children.length > 0;

  const isParentActive = hasChildren && item.children.some((c) => location.pathname === c.path);
  const [open, setOpen] = useState(isParentActive);

  const Icon = item.icon;

  if (!hasChildren) {
    return (
      <NavLink to={item.path} style={{ textDecoration: "none" }}>
        {({ isActive }) => (
          <ListItemButton
            sx={{
              color: isActive ? "#fff" : "#E2E8F0",
              backgroundColor: isActive ? "#2563EB" : "transparent",
              borderRadius: 2,
              mx: 1,
              my: 0.5,
              transition: ".2s",
              "&:hover": {
                backgroundColor: isActive ? "#1D4ED8" : "#1E293B",
                color: "#fff",
              },
            }}
          >
            <ListItemIcon sx={{ color: "inherit", minWidth: 42 }}>
              <Icon />
            </ListItemIcon>
            <ListItemText
              primary={item.title}
              primaryTypographyProps={{ fontWeight: 600, fontSize: 15 }}
            />
          </ListItemButton>
        )}
      </NavLink>
    );
  }

  return (
    <>
      <ListItemButton
        onClick={() => setOpen((o) => !o)}
        sx={{
          color: isParentActive ? "#fff" : "#E2E8F0",
          backgroundColor: isParentActive ? "#1E293B" : "transparent",
          borderRadius: 2,
          mx: 1,
          my: 0.5,
          transition: ".2s",
          "&:hover": { backgroundColor: "#1E293B", color: "#fff" },
        }}
      >
        <ListItemIcon sx={{ color: "inherit", minWidth: 42 }}>
          <Icon />
        </ListItemIcon>
        <ListItemText
          primary={item.title}
          primaryTypographyProps={{ fontWeight: 600, fontSize: 15 }}
        />
        {open ? <ExpandLess /> : <ExpandMore />}
      </ListItemButton>

      <Collapse in={open} timeout="auto" unmountOnExit>
        {item.children.map((sub) => (
          <NavLink key={sub.title} to={sub.path} style={{ textDecoration: "none" }}>
            {({ isActive }) => (
              <ListItemButton
                sx={{
                  pl: 7,
                  py: 1,
                  color: isActive ? "#fff" : "#CBD5E1",
                  backgroundColor: isActive ? "#2563EB" : "transparent",
                  borderRadius: 2,
                  mx: 1,
                  my: 0.25,
                  transition: ".2s",
                  "&:hover": { color: "#fff", backgroundColor: "#334155" },
                }}
              >
                <ListItemText
                  primary={sub.title}
                  primaryTypographyProps={{ fontSize: 14 }}
                />
              </ListItemButton>
            )}
          </NavLink>
        ))}
      </Collapse>
    </>
  );
}
