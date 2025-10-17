import { useContext, useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import Button from "@mui/material/Button";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Box from "@mui/material/Box";
import PersonIcon from "@mui/icons-material/Person";
import TextField from "@mui/material/TextField";
import PopUp from "../../Common/PopUp";
import AddBoxOutlinedIcon from "@mui/icons-material/AddBoxOutlined";
import AddIcon from "@mui/icons-material/Add";
import CheckIcon from "@mui/icons-material/Check";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LoadingButton from "@mui/lab/LoadingButton";
import Autocomplete from "@mui/material/Autocomplete";
import Checkbox from "@mui/material/Checkbox";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormGroup from "@mui/material/FormGroup";
import EditIcon from "@mui/icons-material/Edit";
import Select from "@mui/material/Select";
import {
  Dialog,
  DialogTitle,
  Alert,
  Typography,
  Paper,
  Divider,
} from "@mui/material";

import { WorkContext } from "../ListWork";
import apiClient from "../../Common/apiClient";
import fetchData from "../../Common/fetchData";

import "../../../css/showWork.css";
import "../../../css/taskCompletion.css";

export default function ShowWork() {
  const data = useContext(WorkContext);

  const [formData, updateFormData] = useState({});
  const [helperData, updateHelperData] = useState({});
  const [interns, setInterns] = useState([]);

  const [internsList, updateInternsList] = useState([]);
  const [selectedOptions, setSelectedOptions] = useState([]);

  const handleListChange = (event, value) => {
    setSelectedOptions(value);
  };

  const [loading, setLoading] = useState(false);
  const [statusSuccess, updateStatusSuccess] = useState(false);

  // Task completion state
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [selectedIntern, setSelectedIntern] = useState(""); // For single selection
  const [selectedInterns, setSelectedInterns] = useState([]); // For multiple selection
  const [completionLoading, setCompletionLoading] = useState(false);
  const [completionResult, setCompletionResult] = useState(null);

  function handleSubmit() {
    document.forms["createWorkForm"].requestSubmit();
  }

  const workID = useParams().workID;

  const navigate = useNavigate();

  const handleClose = () => {
    navigate("/works/");
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

  // Handle task completion
  const handleCompleteTask = () => {
    console.log("Opening completion dialog for task:", formData);
    console.log("Available interns:", interns);
    setCompleteDialogOpen(true);
    setSelectedIntern(""); // Reset single selection
    setSelectedInterns([]); // Reset multiple selection
    setCompletionResult(null);
  };

  const handleCloseDialog = () => {
    setCompleteDialogOpen(false);
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
      formData?.assignTo?.filter(
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
          `/work/${formData._id}/complete`,
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
                response.data.xpDetails?.totalXP || formData.xpReward || 10,
              reason: `Task completion: ${formData.title}`,
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

      // Update local formData to reflect completion
      updateFormData((prev) => ({
        ...prev,
        status: 1,
        completionDate: new Date().toLocaleString(),
        completedBy: "manager",
      }));

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

  useEffect(() => {
    let work = data.find((work) => work._id === workID);
    if (work) {
      updateFormData({
        ...work,
      });
      console.log(work);
    } else {
      // alert("no work found");
      return navigate("/works/");
    }
    fetchInterns();
  }, [data]);

  function deleteWorkRequest() {
    updateStatusSuccess(false);
    setLoading(false);
    updateHelperData({});
    console.log("delete data");
  }

  function updateForm(e) {
    console.log(formData);
    updateFormData((prev) => {
      const newObj = {
        ...prev,
        [e.target.name]: String(e.target.value).trim(),
      };
      // console.log(newObj)
      return newObj;
    });
  }

  function submitUpdateWork(e) {
    e.preventDefault();
    // setLoading(true)
    updateStatusSuccess(true);
  }

  return (
    <>
      <div>
        <PopUp
          popUpClose={handleClose}
          title="Work Details"
          icon={<PersonIcon style={{ fontSize: "2rem" }} />}
        >
          <DialogContent dividers>
            {/* <h1>title: {work.title}</h1>
                    <hr />
                    <h2>description: {work.description}</h2>
                    <hr />
                    <h2>deadline: {work.deadline}</h2>
                    <hr />
                    <h2>status: {work.status ? "completed" : "pending"}</h2>
                    <hr />
                     */}
            <div>
              <form
                name="createWorkForm"
                autoComplete="off"
                onSubmit={submitUpdateWork}
              >
                <Box
                  sx={{
                    "& .MuiTextField-root": { my: 2 },
                    px: 2,
                  }}
                >
                  <div>
                    <TextField
                      required
                      id="outlined-required"
                      label="Title"
                      variant="filled"
                      name="title"
                      fullWidth
                      InputLabelProps={{
                        shrink: true,
                      }}
                      value={formData.title || ""}
                      onKeyUp={updateForm}
                      helperText={helperData.title || ""}
                      InputProps={{
                        readOnly: true,
                      }}
                    />
                    <TextField
                      required
                      id="outlined-required"
                      label="Work Description"
                      variant="filled"
                      name="description"
                      fullWidth
                      InputLabelProps={{
                        shrink: true,
                      }}
                      multiline
                      rows={4}
                      value={formData.description || ""}
                      onKeyUp={updateForm}
                      helperText={helperData.description || ""}
                      InputProps={{
                        readOnly: true,
                      }}
                    />
                  </div>
                  <div>
                    {/* <Autocomplete
                                        multiple
                                        id="checkboxes-tags-demo"
                                        options={internsList}
                                        disableCloseOnSelect
                                        getOptionLabel={(option) => option.name}
                                        onChange={handleListChange}
                                        value={selectedOptions}
                                        renderOption={(props, option, { selected }) => (
                                            <li {...props}>
                                                <Checkbox
                                                    icon={icon}
                                                    checkedIcon={checkedIcon}
                                                    style={{ marginRight: 8 }}
                                                    checked={selected}
                                                />
                                                {option.name}
                                            </li>
                                        )}
                                        renderInput={(params) => (
                                            <TextField {...params} label={`Members (${selectedOptions.length})`} placeholder="List of interns / groups" />
                                        )}
                                    /> */}
                    <div className="members">
                      <h3>Members</h3>
                      <ul className={"showWork"}>
                        {formData.assignTo?.map((value, index) => {
                          return <li key={value + index}>{value?.name}</li>;
                        })}
                      </ul>
                    </div>
                  </div>
                  <div>
                    <TextField
                      required
                      type="date"
                      id="outlined-required"
                      label="Deadline"
                      variant="filled"
                      name="deadline"
                      InputLabelProps={{
                        shrink: true,
                      }}
                      onChange={updateForm}
                      value={formData.deadline || ""}
                      helperText={helperData.deadline || ""}
                      InputProps={{
                        readOnly: true,
                      }}
                    />

                    <FormControl sx={{ minWidth: 150, m: 2 }}>
                      <InputLabel id="demo-simple-select-label">
                        Priority
                      </InputLabel>
                      <Select
                        labelId="demo-simple-select-label"
                        id="demo-simple-select"
                        value={formData.priority || 5}
                        label="Priority"
                        name="priority"
                        onChange={updateForm}
                        readOnly
                      >
                        <MenuItem value={1}>1</MenuItem>
                        <MenuItem value={2}>2</MenuItem>
                        <MenuItem value={3}>3</MenuItem>
                        <MenuItem value={4}>4</MenuItem>
                        <MenuItem value={5}>5</MenuItem>
                      </Select>
                    </FormControl>
                  </div>
                  <div>
                    <TextField
                      type="number"
                      id="xp-reward"
                      label="XP Reward"
                      variant="filled"
                      name="xpReward"
                      value={formData.xpReward || 10}
                      InputLabelProps={{
                        shrink: true,
                      }}
                      helperText="Base XP points awarded for task completion"
                      InputProps={{
                        readOnly: true,
                      }}
                    />

                    <TextField
                      type="number"
                      id="bonus-multiplier"
                      label="Bonus Multiplier"
                      variant="filled"
                      name="bonusMultiplier"
                      value={formData.bonusMultiplier || 1.0}
                      InputLabelProps={{
                        shrink: true,
                      }}
                      helperText="Multiplier for early completion bonus"
                      sx={{ ml: 2 }}
                      InputProps={{
                        readOnly: true,
                      }}
                    />
                  </div>

                  {/* XP Calculation Preview */}
                  <div
                    style={{
                      backgroundColor: "#f5f5f5",
                      padding: "1rem",
                      borderRadius: "8px",
                      margin: "1rem 0",
                    }}
                  >
                    <h4>💰 XP Rewards Breakdown</h4>
                    <p>
                      <strong>Base XP:</strong> {formData.xpReward || 10} points
                    </p>
                    <p>
                      <strong>Early Completion Bonuses:</strong>
                    </p>
                    <ul style={{ fontSize: "0.9rem", color: "#666" }}>
                      <li>
                        1+ week early: +
                        {Math.floor(
                          (formData.xpReward || 10) *
                            0.5 *
                            (formData.bonusMultiplier || 1.0)
                        )}{" "}
                        XP (50% bonus)
                      </li>
                      <li>
                        3-6 days early: +
                        {Math.floor(
                          (formData.xpReward || 10) *
                            0.3 *
                            (formData.bonusMultiplier || 1.0)
                        )}{" "}
                        XP (30% bonus)
                      </li>
                      <li>
                        1-2 days early: +
                        {Math.floor(
                          (formData.xpReward || 10) *
                            0.15 *
                            (formData.bonusMultiplier || 1.0)
                        )}{" "}
                        XP (15% bonus)
                      </li>
                      <li>
                        Same day: +
                        {Math.floor(
                          (formData.xpReward || 10) *
                            0.05 *
                            (formData.bonusMultiplier || 1.0)
                        )}{" "}
                        XP (5% bonus)
                      </li>
                    </ul>
                    <p>
                      <strong>Maximum Possible XP:</strong>{" "}
                      {(formData.xpReward || 10) +
                        Math.floor(
                          (formData.xpReward || 10) *
                            0.5 *
                            (formData.bonusMultiplier || 1.0)
                        )}{" "}
                      points
                    </p>
                  </div>

                  {/* Task Status and Completion */}
                  {formData.status === 1 ? (
                    <div
                      style={{
                        backgroundColor: "#e8f5e8",
                        padding: "1rem",
                        borderRadius: "8px",
                        color: "#2e7d32",
                      }}
                    >
                      <h4>✅ Task Completed</h4>
                      <p>
                        <strong>Completion Date:</strong>{" "}
                        {formData.completionDate}
                      </p>
                      <p>
                        <strong>Completed By:</strong> {formData.completedBy}
                      </p>
                    </div>
                  ) : (
                    <div
                      style={{
                        backgroundColor: "#fff3e0",
                        padding: "1rem",
                        borderRadius: "8px",
                        color: "#f57c00",
                      }}
                    >
                      <h4>⏳ Task Pending</h4>
                      <p>Task is still in progress and awaiting completion.</p>
                      <Button
                        variant="contained"
                        color="success"
                        onClick={handleCompleteTask}
                        startIcon={<CheckCircleIcon />}
                        sx={{ mt: 1 }}
                      >
                        Mark as Complete
                      </Button>
                    </div>
                  )}
                  {/* <LoadingButton
                                    onClick={statusSuccess ? null : handleSubmit}
                                    sx={{ mt: 2, mr: 2 }}
                                    endIcon={statusSuccess ? <CheckIcon /> : <EditIcon />}
                                    loading={loading}
                                    loadingPosition="end"
                                    color={statusSuccess ? "success" : "info"}
                                    variant="contained"
                                >
                                    <span>{statusSuccess ? "Updated" : "Update"}</span>
                                </LoadingButton>
                                <Button onClick={deleteWorkRequest} sx={{ mt: 2 }} variant="contained" color='error'>Delete</Button> */}
                  <Button
                    sx={{ mt: 2 }}
                    onClick={function () {
                      navigate("/works/");
                    }}
                    variant="contained"
                    color="primary"
                  >
                    Close
                  </Button>
                </Box>
              </form>
            </div>
          </DialogContent>
        </PopUp>

        {/* Task Completion Dialog */}
        <Dialog
          open={completeDialogOpen}
          onClose={handleCloseDialog}
          maxWidth="sm"
          fullWidth
          className="task-completion-dialog"
        >
          <DialogTitle>Complete Task: {formData?.title}</DialogTitle>
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
                        Select one or more interns to award XP for completing
                        this task.
                      </Typography>

                      {formData && (
                        <div className="xp-breakdown-box">
                          <Typography variant="subtitle2">
                            💰 XP Breakdown:
                          </Typography>
                          <Typography variant="body2">
                            Base XP: {formData.xpReward || 10} points
                          </Typography>
                          <Typography variant="body2">
                            Bonus Multiplier: {formData.bonusMultiplier || 1.0}x
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
      </div>
    </>
  );
}
