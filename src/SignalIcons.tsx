import { Box, Typography } from "@mui/material";

export const SignalBars = ({ level }: { level: number }) => {
  const colors = ["#ccc", "#f00", "#ffb400", "#8bc34a", "#4caf50", "#2e7d32"];
  return (
    <Box display="flex" alignItems="flex-end" height={40} gap={0.5}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Box
          key={n}
          width={6}
          height={n * 8}
          borderRadius={2}
          bgcolor={n <= level ? colors[level] : "#ddd"}
        />
      ))}
    </Box>
  );
};
