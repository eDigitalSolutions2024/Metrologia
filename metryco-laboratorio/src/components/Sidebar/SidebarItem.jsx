import { ListItemButton, ListItemIcon, ListItemText, Collapse, Box } from "@mui/material";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";

const activePill = {
  color: "#fff",
  background: "linear-gradient(135deg, rgba(37,99,235,.92), rgba(29,78,216,.92))",
  boxShadow: "0 10px 24px -6px rgba(37,99,235,.55)",
};
const idle = { color: "rgba(230,237,246,.72)", background: "transparent" };
const hover = { background: "rgba(255,255,255,.055)", color: "#fff" };

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
            disableRipple
            sx={{
              position: "relative", borderRadius: 2.5, mx: 0.5, my: 0.3, py: 0.85, pl: 1.75,
              transition: "background .18s, color .18s, box-shadow .18s",
              ...(isActive ? activePill : idle),
              "&:hover": isActive ? {} : hover,
              "&::before": isActive
                ? { content: '""', position: "absolute", left: -0.5, top: "26%", bottom: "26%", width: 3, borderRadius: 3, background: "#93C5FD" }
                : {},
            }}
          >
            <ListItemIcon sx={{ color: "inherit", minWidth: 36 }}>
              <Icon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary={item.title} slotProps={{ primary: { fontWeight: 600, fontSize: 14 } }} />
          </ListItemButton>
        )}
      </NavLink>
    );
  }

  return (
    <>
      <ListItemButton
        onClick={() => setOpen((o) => !o)}
        disableRipple
        sx={{
          borderRadius: 2.5, mx: 0.5, my: 0.3, py: 0.85, pl: 1.75,
          transition: "background .18s, color .18s",
          ...(isParentActive ? { color: "#fff", background: "rgba(255,255,255,.06)" } : idle),
          "&:hover": hover,
        }}
      >
        <ListItemIcon sx={{ color: "inherit", minWidth: 36 }}>
          <Icon fontSize="small" />
        </ListItemIcon>
        <ListItemText primary={item.title} slotProps={{ primary: { fontWeight: 600, fontSize: 14 } }} />
        <Box sx={{ color: "rgba(230,237,246,.5)", display: "flex", transition: "transform .2s", transform: open ? "none" : "rotate(-90deg)" }}>
          <ExpandMore fontSize="small" />
        </Box>
      </ListItemButton>

      <Collapse in={open} timeout={220} unmountOnExit>
        <Box sx={{ ml: 2.75, my: 0.25, borderLeft: "1px solid rgba(255,255,255,.09)" }}>
          {item.children.map((sub) => (
            <NavLink key={sub.title} to={sub.path} style={{ textDecoration: "none" }}>
              {({ isActive }) => (
                <ListItemButton
                  disableRipple
                  sx={{
                    pl: 2, py: 0.6, borderRadius: 2, mx: 0.75, my: 0.2,
                    transition: "background .18s, color .18s",
                    ...(isActive
                      ? { color: "#fff", background: "linear-gradient(135deg, rgba(37,99,235,.9), rgba(29,78,216,.9))" }
                      : { color: "rgba(203,213,225,.68)", background: "transparent" }),
                    "&:hover": isActive ? {} : { color: "#fff", background: "rgba(255,255,255,.055)" },
                  }}
                >
                  <ListItemText primary={sub.title} slotProps={{ primary: { fontSize: 13 } }} />
                </ListItemButton>
              )}
            </NavLink>
          ))}
        </Box>
      </Collapse>
    </>
  );
}
