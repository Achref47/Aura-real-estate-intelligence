import { useTheme } from "../context/ThemeContext";
import { motion } from "framer-motion";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <motion.button
      onClick={toggleTheme}
      whileTap={{ scale: 0.9 }}
      style={{
        position: "absolute",
        top: 20,
        right: 20,
        padding: "10px 15px",
        borderRadius: "20px",
      }}
    >
      {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
    </motion.button>
  );
}