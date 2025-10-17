import { createContext, useEffect, useState } from "react";

import EngineeringOutlinedIcon from "@mui/icons-material/EngineeringOutlined";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { Link, Outlet, useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import SearchIcon from "@mui/icons-material/Search";
import Tabs from "@mui/material/Tabs";
import AddBoxOutlinedIcon from "@mui/icons-material/AddBoxOutlined";
import Tab from "@mui/material/Tab";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import PageTitle from "../Common/PageTitle";

import "../../css/work.css";
import "../../css/taskCompletion.css";

import DataTable from "../Common/DataTable";
import fetchData from "../Common/fetchData";
import apiClient from "../Common/apiClient";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  FormControlLabel,
  FormGroup,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Checkbox,
  Paper,
} from "@mui/material";

export const WorkContext = createContext();

const columns = [
  {
    id: "sr",
    label: "#",
    minWidth: 10,
  },
  {
    id: "title",
    label: "Title",
    minWidth: 170,
  },
  {
    id: "priority",
    label: "Priority",
  },
  // {
  //     id: 'status',
  //     label: 'Status',
  // },
  {
    id: "assignedOn",
    label: "Assigned On",
  },
  {
    id: "deadline",
    label: "Deadline",
  },
  {
    id: "operations",
    label: "Task Details",
    align: "right",
  },
];

function createRows(rows, onCompleteTask) {
  return rows.map((value, index) => {
    return {
      sr: ++index,
      title: value.title,
      priority: value.priority,
      status: value.status,
      assignedOn: value.createDate,
      deadline: new Date(value.deadline).toLocaleDateString(),
      operations: (
        <>
          <Link
            style={{ padding: ".1rem", display: "inline-block" }}
            to={"/works/" + value._id}
          >
            {/* + value._id */}
            <Button
              size="small"
              variant="contained"
              style={{ textTransform: "capitalize" }}
            >
              <Typography noWrap>View</Typography>
            </Button>
          </Link>
          {value.status === 0 && (
            <Button
              size="small"
              variant="contained"
              color="success"
              style={{ textTransform: "capitalize", marginLeft: "0.5rem" }}
              startIcon={<CheckCircleIcon />}
              onClick={() => onCompleteTask(value)}
            >
              <Typography noWrap>Complete</Typography>
            </Button>
          )}
        </>
      ),
    };
  });
}

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          <div>{children}</div>
        </Box>
      )}
    </div>
  );
}

TabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.number.isRequired,
  value: PropTypes.number.isRequired,
};

function a11yProps(index) {
  return {
    id: `simple-tab-${index}`,
    "aria-controls": `simple-tabpanel-${index}`,
  };
}

function divideDataToTabs(oldData, data, onCompleteTask) {
  let pending = [];
  let pastDue = [];
  let completed = [];

  const today = new Date();

  data.forEach((work) => {
    const deadline = new Date(work.deadline);
    if (work.status) {
      completed.push(work);
    } else {
      if (
        deadline >= today ||
        deadline.toLocaleDateString() === today.toLocaleDateString()
      ) {
        pending.push(work);
      } else {
        pastDue.push(work);
      }
    }
  });
  pending.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

  return {
    pending: createRows(pending, onCompleteTask),
    pastDue: createRows(pastDue, onCompleteTask),
    completed: createRows(completed, onCompleteTask),
  };
}

export default function ListWorks() {
  const navigate = useNavigate();
  const [tabIndex, updateTabIndex] = useState(0);

  const [rows, updateRows] = useState({});
  const [data, updateData] = useState([]);
  const [searchOptions, updateSearchOptions] = useState([]);
  const [interns, setInterns] = useState([]);

  const [loadingStatus, updateLoadingStatus] = useState(true);

  // Task completion dialog state
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedIntern, setSelectedIntern] = useState(""); // For single selection
  const [selectedInterns, setSelectedInterns] = useState([]); // For multiple selection
  const [completionLoading, setCompletionLoading] = useState(false);
  const [completionResult, setCompletionResult] = useState(null);

  const handleChange = (event, newValue) => {
    updateTabIndex(newValue);
  };

  // Handle task completion
  const handleCompleteTask = (task) => {
    console.log("Opening completion dialog for task:", task);
    console.log("Available interns:", interns);
    setSelectedTask(task);
    setCompleteDialogOpen(true);
    setSelectedIntern(""); // Reset single selection
    setSelectedInterns([]); // Reset multiple selection
    setCompletionResult(null);
  };

  const handleCloseDialog = () => {
    setCompleteDialogOpen(false);
    setSelectedTask(null);
    setSelectedIntern(""); // Reset single selection
    setSelectedInterns([]); // Reset multiple selection
    setCompletionResult(null);
  };

  // Helper functions for multiple selection
  const handleInternCheckboxChange = (internId, checked) => {
    if (checked) {
      setSelectedInterns((prev) => [...prev, internId]);
    } else {
      setSelectedInterns((prev) => prev.filter((id) => id !== internId));
    }
  };

  const isInternSelected = (internId) => {
    return selectedInterns.includes(internId);
  };

  // Get available interns for the task
  const getAvailableInterns = () => {
    // First check if there are specific interns assigned to this task
    const assignedInterns =
      selectedTask?.assignTo?.filter(
        (assignment) => assignment.type === "intern"
      ) || [];

    if (assignedInterns.length > 0) {
      // Return assigned interns with their full data
      return assignedInterns
        .map((assignment) => {
          const intern = interns.find((i) => i._id === assignment._id);
          return intern
            ? { ...intern, assignmentName: assignment.name }
            : {
                _id: assignment._id,
                fullName: assignment.name || "Unknown Intern",
                emailID: "N/A",
              };
        })
        .filter(Boolean);
    }

    // If no specific assignments, return all available interns
    return interns;
  };

  const completeTask = async () => {
    const availableInterns = getAvailableInterns();

    // Validation - always check for checkbox selections
    if (selectedInterns.length === 0) {
      alert("Please select at least one intern to award XP to");
      return;
    }

    setCompletionLoading(true);
    try {
      // For multiple interns, we'll complete the task and award XP to each selected intern
      if (selectedInterns.length > 0) {
        // Complete the task with the first intern, then award XP to others
        const response = await apiClient.patch(
          `/work/${selectedTask._id}/complete`,
          {
            completedBy: "manager",
            internId: selectedInterns[0], // First intern completes the task
          }
        );

        // Award XP to remaining interns (if any)
        for (let i = 1; i < selectedInterns.length; i++) {
          try {
            await apiClient.patch(`/candidate/award-xp`, {
              candidateID: selectedInterns[i],
              points:
                response.data.xpDetails?.totalXP || selectedTask.xpReward || 10,
              reason: `Task completion: ${selectedTask.title}`,
              awardedBy: "manager",
            });
          } catch (error) {
            console.warn(
              `Failed to award XP to intern ${selectedInterns[i]}:`,
              error
            );
          }
        }

        setCompletionResult({
          ...response.data,
          multipleInterns: selectedInterns.length > 1,
          selectedInternsCount: selectedInterns.length,
          selectedInternNames: selectedInterns.map((id) => {
            const intern = availableInterns.find((i) => i._id === id);
            return intern
              ? intern.fullName || `${intern.firstName} ${intern.lastName}`
              : "Unknown";
          }),
        });
      }

      // Refresh the work list
      getData();

      setTimeout(() => {
        handleCloseDialog();
      }, 3000);
    } catch (error) {
      console.error("Error completing task:", error);
      alert(error?.response?.data?.message || "Error completing task");
    } finally {
      setCompletionLoading(false);
    }
  };

  // Fetch interns for task completion
  const fetchInterns = async () => {
    try {
      // First try to get hired interns
      let response = await fetchData("GET", "/candidate/intern");
      console.log("Fetched hired interns:", response);

      // If no hired interns, temporarily fetch all candidates for testing
      if (!response || response.length === 0) {
        console.log(
          "No hired interns found, fetching all candidates for testing..."
        );
        response = await fetchData("GET", "/candidate");
        console.log("Fetched all candidates:", response);
      }

      setInterns(response || []);
    } catch (error) {
      console.error("Error fetching interns:", error);
      // Fallback to empty array
      setInterns([]);
    }
  };

  function getData(
    fetchFrom = () => fetchData("get", "/work"),
    reloadSearchOptions = true
  ) {
    fetchFrom()
      .then((data) => {
        // console.log(data)
        data = data.reverse();
        updateRows((oldData) =>
          divideDataToTabs(oldData, data, handleCompleteTask)
        );
        updateData(data);
        console.log(data);

        reloadSearchOptions &&
          updateSearchOptions(() => {
            const titles = data.map((data) => {
              return { title: data.title ?? "" };
            });
            // give Set a new array that contains only string title, destructure set in array and on that array, iterate through map and get values as objects
            let uniqueNames = [
              ...new Set(titles.map((data) => data.title)),
            ].map((title) => {
              return { title };
            });
            return [...uniqueNames];
          });
      })
      .catch((error) => {
        console.log(error);
        if (error.message == "token is not valid") {
          navigate("/authentication/login");
        }
      })
      .finally(() => {
        updateLoadingStatus(false);
      });
  }

  useEffect(() => {
    getData();
    fetchInterns();
  }, []);

  return (
    <>
      <PageTitle title="assign work">
        <EngineeringOutlinedIcon />
      </PageTitle>
      <div className="headerGap"></div>

      <div className="container-top">
        <Link to={"/works/add"}>
          <Button
            variant="contained"
            color="info"
            startIcon={<AddBoxOutlinedIcon />}
          >
            Assign New Task
          </Button>
        </Link>
        <span>
          <Autocomplete
            freeSolo
            id="free-solo-2-demo"
            disableClearable
            options={searchOptions.map((option) => option.title)}
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                label="Search"
                InputProps={{
                  ...params.InputProps,
                  type: "search",
                }}
              />
            )}
          />
          <Button variant="contained" color="info" endIcon={<SearchIcon />}>
            Search
          </Button>
        </span>
      </div>

      <Box sx={{ width: "100%" }}>
        <Box sx={{ borderBottom: 2, borderColor: "divider" }}>
          <Tabs
            value={tabIndex}
            onChange={handleChange}
            aria-label="basic tabs example"
          >
            <Tab label="PENDING" {...a11yProps(0)} />
            <Tab label="PAST-DUE" style={{ color: "red" }} {...a11yProps(1)} />
            <Tab
              label="COMPLETED"
              style={{ color: "green" }}
              {...a11yProps(2)}
            />
          </Tabs>
        </Box>
        <TabPanel value={tabIndex} index={0}>
          <DataTable
            loading={loadingStatus}
            rows={rows.pending || []}
            cols={columns}
          />
        </TabPanel>
        <TabPanel value={tabIndex} index={1}>
          <DataTable
            loading={loadingStatus}
            rows={rows.pastDue || []}
            cols={columns}
          />
        </TabPanel>
        <TabPanel value={tabIndex} index={2}>
          <DataTable
            loading={loadingStatus}
            rows={rows.completed || []}
            cols={columns}
          />
        </TabPanel>
      </Box>
      <WorkContext.Provider value={data}>
        <Outlet />
      </WorkContext.Provider>

      {/* Task Completion Dialog */}
      <Dialog
        open={completeDialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        className="task-completion-dialog"
      >
        <DialogTitle>Complete Task: {selectedTask?.title}</DialogTitle>
        <DialogContent>
          {completionResult ? (
            <div className="task-completion-success">
              <Typography variant="h6">
                🎉 Task Completed Successfully!
              </Typography>

              {completionResult.multipleInterns ? (
                <>
                  <Typography>
                    <strong>Interns Awarded:</strong>{" "}
                    {completionResult.selectedInternsCount}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    <strong>Recipients:</strong>{" "}
                    {completionResult.selectedInternNames?.join(", ")}
                  </Typography>
                </>
              ) : (
                <>
                  <Typography>
                    <strong>Base XP:</strong>{" "}
                    {completionResult.xpDetails?.baseXP || 0} points
                  </Typography>
                  <Typography>
                    <strong>Bonus XP:</strong>{" "}
                    {completionResult.xpDetails?.bonusXP || 0} points
                  </Typography>
                </>
              )}

              <Typography>
                <strong>Total XP Awarded:</strong>{" "}
                {completionResult.xpDetails?.totalXP || 0} points
              </Typography>
              <Typography sx={{ mt: 1, fontSize: "0.9rem" }}>
                <strong>Timing:</strong>{" "}
                {completionResult.xpDetails?.timingDescription}
              </Typography>
            </div>
          ) : (
            <>
              {(() => {
                const availableInterns = getAvailableInterns();

                return (
                  <>
                    <Typography sx={{ mb: 2 }}>
                      Select one or more interns to award XP for completing this
                      task.
                    </Typography>

                    {selectedTask && (
                      <div className="xp-breakdown-box">
                        <Typography variant="subtitle2">
                          💰 XP Breakdown:
                        </Typography>
                        <Typography variant="body2">
                          Base XP: {selectedTask.xpReward || 10} points
                        </Typography>
                        <Typography variant="body2">
                          Bonus Multiplier:{" "}
                          {selectedTask.bonusMultiplier || 1.0}x
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ mt: 1, fontSize: "0.8rem" }}
                        >
                          Early completion bonuses will be calculated
                          automatically based on deadline.
                        </Typography>
                      </div>
                    )}

                    {/* Always show checkbox interface */}
                    <Paper elevation={1} sx={{ p: 2, mt: 2 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Select Interns ({selectedInterns.length} selected):
                      </Typography>
                      <FormGroup>
                        {availableInterns.map((intern) => (
                          <FormControlLabel
                            key={intern._id}
                            control={
                              <Checkbox
                                checked={isInternSelected(intern._id)}
                                onChange={(e) =>
                                  handleInternCheckboxChange(
                                    intern._id,
                                    e.target.checked
                                  )
                                }
                                color="primary"
                              />
                            }
                            label={
                              <Box>
                                <Typography variant="body2">
                                  {intern.fullName ||
                                    `${intern.firstName} ${intern.lastName}`}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  {intern.emailID}
                                </Typography>
                              </Box>
                            }
                          />
                        ))}

                        {availableInterns.length === 0 && (
                          <Typography color="text.secondary" sx={{ p: 1 }}>
                            No interns available
                          </Typography>
                        )}
                      </FormGroup>

                      {selectedInterns.length > 0 && (
                        <Box
                          sx={{
                            mt: 2,
                            p: 1,
                            bgcolor: "success.light",
                            borderRadius: 1,
                          }}
                        >
                          <Typography variant="body2" color="success.dark">
                            ✅ {selectedInterns.length} intern
                            {selectedInterns.length > 1 ? "s" : ""} selected
                          </Typography>
                        </Box>
                      )}
                    </Paper>
                  </>
                );
              })()}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>
            {completionResult ? "Close" : "Cancel"}
          </Button>
          {!completionResult && (
            <Button
              onClick={completeTask}
              variant="contained"
              color="success"
              disabled={completionLoading}
              startIcon={<CheckCircleIcon />}
              className="complete-task-btn"
            >
              {completionLoading ? "Completing..." : "Complete Task"}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
}
