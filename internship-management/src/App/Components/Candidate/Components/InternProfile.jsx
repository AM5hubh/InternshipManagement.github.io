import { useContext } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Button from '@mui/material/Button';
import PopUp from "../../Common/PopUp";
import DialogContent from '@mui/material/DialogContent';
import PersonIcon from '@mui/icons-material/Person';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import GradeIcon from '@mui/icons-material/Grade';
import fetchData from '../../Common/fetchData'
import apiClient from '../../Common/apiClient'
import BadgeIcon from '@mui/icons-material/Badge';

import { InternContext } from '../ListInterns';

export default function InternProfile() {
    const data = useContext(InternContext);

    const candidateID = useParams().candidateID

    const navigate = useNavigate();

    const handleClose = () => {
        navigate("/candidates/interns/");
    };

    let candidate = data.find(candidate => candidate._id === candidateID)
    if (!candidate) {
        return;
    }

    function repeat(number, callback) {
        const newArr = []
        for (let i = 0; i < number; i++) {
            newArr.push(callback(i))
        }
        return newArr;
    }

    return <>
        <PopUp popUpClose={handleClose} title="Intern Profile" icon={<PersonIcon style={{ fontSize: "2rem" }} />}>
            <DialogContent>
                <div style={{ borderTop: "1px solid #dedede", marginTop: "1rem", padding: "1rem" }}>
                    <h4>BADGES & XP</h4>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        {(candidate.badges || []).map((b, i) => <div key={i} style={{ border: '1px solid #ddd', padding: '0.4rem 0.6rem', borderRadius: 6 }}><BadgeIcon style={{ verticalAlign: 'middle', marginRight: 6 }} />{b.name} <small>({b.points} XP)</small></div>)}
                    </div>
                    <div style={{ marginTop: '0.5rem' }}>Total XP: <strong>{candidate.xp || 0}</strong></div>

                    {/* Manager actions: assign badge & download certificate */}
                    <div style={{ marginTop: '1rem', display: 'flex', gap: '.5rem' }}>
                        <input id="badgeNameInput" placeholder="Badge name (e.g. Top Performer)" style={{ padding: '.4rem' }} />
                        <input id="badgePointsInput" type="number" placeholder="Points" style={{ width: 80, padding: '.4rem' }} />
                        <button onClick={async () => {
                            const badgeName = document.getElementById('badgeNameInput').value;
                            const points = Number(document.getElementById('badgePointsInput').value || 0);
                            if (!badgeName) return alert('Badge name required');
                            try {
                                await apiClient.patch('/candidate/badge', { candidateID: candidate._id, badgeName, points, assignedBy: 'manager' });
                                window.location.reload();
                            } catch (err) { alert(err?.response?.data?.message || err.message) }
                        }}>Assign Badge</button>

                        <button onClick={async () => {
                            try {
                                const resp = await apiClient.getBlob(`/candidate/${candidate._id}/certificate?download=1`);
                                const blob = new Blob([resp.data], { type: 'application/pdf' });
                                const blobUrl = window.URL.createObjectURL(blob);
                                window.open(blobUrl, '_blank');
                            } catch (err) { alert(err?.response?.data?.message || err.message) }
                        }}>Download Certificate</button>
                    </div>
                </div>
                <div className="space-between">
                    <a href={candidate.resumeLink} target="_blank" rel="noreferrer" style={{ marginRight: "1rem" }}>
                        <Button variant="contained">Resume</Button>
                    </a>
                </div>
                <div style={{ borderTop: "1px solid #dedede", marginTop: "1rem" }}>
                    <h4 style={{ padding: "1rem 0 0 1rem" }}>PERSONAL DETAILS</h4>
                    <Box
                        sx={{
                            '& .MuiTextField-root': { m: 2 },
                        }}
                        autoComplete="off"
                    >
                        <div>
                            <TextField id="standard-basic" label="Name" variant="standard"
                                defaultValue={
                                    candidate.fullName
                                }
                                InputLabelProps={{
                                    shrink: true,
                                }}
                                InputProps={{
                                    readOnly: true,
                                }}
                            />
                            <TextField id="standard-basic" label="Age" variant="standard"
                                defaultValue={
                                    candidate.age
                                }
                                InputLabelProps={{
                                    shrink: true,
                                }}
                                InputProps={{
                                    readOnly: true,
                                }}
                            />
                        </div>
                        <div>
                            <TextField id="standard-basic" label="Mobile" variant="standard"
                                defaultValue={
                                    candidate.mobile
                                }
                                InputLabelProps={{
                                    shrink: true,
                                }}
                                InputProps={{
                                    readOnly: true,
                                }}
                            />
                            <TextField id="standard-basic" label="Alternative Mobile" variant="standard"
                                defaultValue={
                                    candidate.alternativeMobile
                                }
                                InputLabelProps={{
                                    shrink: true,
                                }}
                                InputProps={{
                                    readOnly: true,
                                }}
                            />
                            <TextField id="standard-basic" label="Email" variant="standard"
                                defaultValue={
                                    candidate.emailID
                                }
                                InputLabelProps={{
                                    shrink: true,
                                }}
                                InputProps={{
                                    readOnly: true,
                                }}
                            />
                        </div>
                        <div>
                            <TextField id="standard-basic" label="GitHub" variant="standard"
                                defaultValue={
                                    candidate.github
                                }
                                InputLabelProps={{
                                    shrink: true,
                                }}
                                InputProps={{
                                    readOnly: true,
                                }}
                            />
                            <TextField id="standard-basic" label="Telegram" variant="standard"
                                defaultValue={
                                    candidate.telegram
                                }
                                InputLabelProps={{
                                    shrink: true,
                                }}
                                InputProps={{
                                    readOnly: true,
                                }}
                            />
                        </div>
                        <div>
                            <TextField id="standard-basic" label="College Name" variant="standard"
                                defaultValue={
                                    candidate.collegeName
                                }
                                InputLabelProps={{
                                    shrink: true,
                                }}
                                InputProps={{
                                    readOnly: true,
                                }}
                            />
                            <TextField id="standard-basic" label="Current Graduation" variant="standard"
                                defaultValue={
                                    candidate.currentGraduation
                                }
                                InputLabelProps={{
                                    shrink: true,
                                }}
                                InputProps={{
                                    readOnly: true,
                                }}
                            />
                            <TextField id="standard-basic" label="Graduation Year" variant="standard"
                                defaultValue={
                                    candidate.graduationYear
                                }
                                InputLabelProps={{
                                    shrink: true,
                                }}
                                InputProps={{
                                    readOnly: true,
                                }}
                            />
                        </div>
                    </Box>
                </div>
                <div style={{ borderTop: "1px solid #dedede", marginTop: "1rem" }}>
                    <h4 style={{ padding: "1rem 0 0 1rem" }}>HIRE DETAILS</h4>
                    <Box
                        sx={{
                            '& .MuiTextField-root': { m: 2 },
                        }}
                        autoComplete="off"
                    >
                        <div>
                            <TextField id="standard-basic" label="From Date" variant="standard"
                                defaultValue={
                                    candidate.hireDetails.fromDate
                                }
                                InputLabelProps={{
                                    shrink: true,
                                }}
                                InputProps={{
                                    readOnly: true,
                                }}
                            />
                            <TextField id="standard-basic" label="To Date" variant="standard"
                                defaultValue={
                                    candidate.hireDetails.toDate
                                }
                                InputLabelProps={{
                                    shrink: true,
                                }}
                                InputProps={{
                                    readOnly: true,
                                }}
                            />
                        </div>
                        <div>
                            <TextField id="standard-basic" label="Internship Type" variant="standard"
                                defaultValue={
                                    candidate.hireDetails.isPaid ? "paid" : (candidate.hireDetails.isStipend ? "stipend" : "free")
                                }
                                InputLabelProps={{
                                    shrink: true,
                                }}
                                InputProps={{
                                    readOnly: true,
                                }}
                            />
                            <TextField id="standard-basic" label="Amount" variant="standard"
                                defaultValue={
                                    candidate.hireDetails.amount
                                }
                                InputLabelProps={{
                                    shrink: true,
                                }}
                                InputProps={{
                                    readOnly: true,
                                }}
                            />
                        </div>
                    </Box>
                </div>
                <div style={{ borderTop: "1px solid #dedede", marginTop: "1rem", padding: "1rem" }}>
                    {candidate.feedback.length ?
                        <>
                            <h4>FEEDBACK</h4>
                            <ul style={{ padding: "1rem" }} className="showFeedbackList">
                                {
                                    candidate.feedback.map((question, index) => {
                                        if (Number(question[1])) {
                                            return <li key={"feedbackQuestion1" + index}><strong>{question[0]}</strong> <span>{repeat(question[1], v => <GradeIcon key={"feedbackQuestion" + index + v + "rating"} style={{ color: "#ffe159" }} />)}</span></li>
                                        } else {
                                            return <li key={"feedbackQuestion2" + index} className="text"><strong>{question[0]}:</strong> <span>{question[1]} </span></li>
                                        }
                                    })
                                }
                            </ul>
                        </>
                        : ""
                    }
                </div>
            </DialogContent>

        </PopUp>
    </>
}