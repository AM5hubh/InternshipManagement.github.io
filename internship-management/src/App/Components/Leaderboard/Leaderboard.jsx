import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Avatar,
  LinearProgress,
} from "@mui/material";
import {
  EmojiEvents as TrophyIcon,
  WorkspacePremium as BadgeIcon,
} from "@mui/icons-material";
import apiClient from "../Common/apiClient";
import PageTitle from "../Common/PageTitle";

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [department, setDepartment] = useState("");
  const [period, setPeriod] = useState("all-time");

  useEffect(() => {
    fetchLeaderboard();
  }, [department, period]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (department) params.append("department", department);
      if (period !== "all-time") params.append("period", period);

      const response = await apiClient.get(`/candidate/leaderboard?${params}`);
      setLeaderboard(response.data);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRankColor = (rank) => {
    if (rank === 1) return "#FFD700"; // Gold
    if (rank === 2) return "#C0C0C0"; // Silver
    if (rank === 3) return "#CD7F32"; // Bronze
    return "#666";
  };

  const getRankIcon = (rank) => {
    if (rank <= 3) {
      return (
        <TrophyIcon style={{ color: getRankColor(rank), fontSize: "1.5rem" }} />
      );
    }
    return (
      <span style={{ fontSize: "1.2rem", fontWeight: "bold", color: "#666" }}>
        #{rank}
      </span>
    );
  };

  const getXPLevel = (xp) => {
    return Math.floor(xp / 100) + 1; // Every 100 XP = 1 level
  };

  const getXPProgress = (xp) => {
    return xp % 100; // Progress within current level
  };

  if (loading) {
    return (
      <Box>
        <PageTitle title="Leaderboard" />
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box>
      <PageTitle title="Intern Leaderboard" />

      {/* Filters */}
      <Box sx={{ mb: 3, display: "flex", gap: 2 }}>
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Department</InputLabel>
          <Select
            value={department}
            label="Department"
            onChange={(e) => setDepartment(e.target.value)}
          >
            <MenuItem value="">All Departments</MenuItem>
            <MenuItem value="Engineering">Engineering</MenuItem>
            <MenuItem value="Design">Design</MenuItem>
            <MenuItem value="Marketing">Marketing</MenuItem>
            <MenuItem value="Sales">Sales</MenuItem>
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Period</InputLabel>
          <Select
            value={period}
            label="Period"
            onChange={(e) => setPeriod(e.target.value)}
          >
            <MenuItem value="all-time">All Time</MenuItem>
            <MenuItem value="monthly">This Month</MenuItem>
            <MenuItem value="weekly">This Week</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Top 3 Cards */}
      {leaderboard.length > 0 && (
        <Box sx={{ mb: 4, display: "flex", gap: 2, justifyContent: "center" }}>
          {leaderboard.slice(0, 3).map((intern) => (
            <Card
              key={intern._id}
              sx={{
                minWidth: 200,
                textAlign: "center",
                border:
                  intern.rank === 1
                    ? "2px solid #FFD700"
                    : intern.rank === 2
                    ? "2px solid #C0C0C0"
                    : "2px solid #CD7F32",
              }}
            >
              <CardContent>
                <Box sx={{ display: "flex", justifyContent: "center", mb: 1 }}>
                  {getRankIcon(intern.rank)}
                </Box>
                <Avatar
                  sx={{
                    width: 60,
                    height: 60,
                    mx: "auto",
                    mb: 1,
                    bgcolor: getRankColor(intern.rank),
                  }}
                >
                  {intern.fullName?.charAt(0) || "I"}
                </Avatar>
                <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                  {intern.name || "Unknown Intern"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {intern.status} • Level {getXPLevel(intern.xp)}
                </Typography>
                <Typography
                  variant="h4"
                  sx={{ color: getRankColor(intern.rank), fontWeight: "bold" }}
                >
                  {intern.xp}
                </Typography>
                <Typography variant="body2">XP</Typography>
                <Box sx={{ display: "flex", justifyContent: "center", mt: 1 }}>
                  <Chip
                    icon={<BadgeIcon />}
                    label={`${intern.badgeCount} badges`}
                    size="small"
                    variant="outlined"
                  />
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* Full Leaderboard Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Rank</TableCell>
              <TableCell>Intern/Candidate</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Level</TableCell>
              <TableCell>XP</TableCell>
              <TableCell>Progress</TableCell>
              <TableCell>Badges</TableCell>
              <TableCell>Department</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {leaderboard.map((intern) => (
              <TableRow
                key={intern._id}
                sx={{
                  backgroundColor:
                    intern.rank <= 3
                      ? `${getRankColor(intern.rank)}15`
                      : "inherit",
                }}
              >
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    {getRankIcon(intern.rank)}
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <Avatar sx={{ width: 32, height: 32, mr: 1 }}>
                      {intern.fullName?.charAt(0) || "I"}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: "medium" }}>
                        {intern.name || "Unknown Intern"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {intern.email}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={intern.status || "Candidate"}
                    size="small"
                    color={intern.status === "Hired" ? "success" : "default"}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                    Level {getXPLevel(intern.xp)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: "bold", color: "primary.main" }}
                  >
                    {intern.xp}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ width: "100px" }}>
                    <LinearProgress
                      variant="determinate"
                      value={getXPProgress(intern.xp)}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {getXPProgress(intern.xp)}/100 XP
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    icon={<BadgeIcon />}
                    label={intern.badgeCount}
                    size="small"
                    variant="outlined"
                    color="primary"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {intern.department || "N/A"}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {leaderboard.length === 0 && (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <Typography variant="h6" color="text.secondary">
            No interns or candidates with XP found for the selected criteria
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Complete tasks to start earning XP and appear on the leaderboard!
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default Leaderboard;
