const { createAPIError } = require("../errors/CustomeAPIError");
const Candidate = require("../models/Candidate");
const fs = require('fs');
const path = require('path');


const controller = {
    // GET REQUESTS
    async getCandidates(req, res, next) {
        try {
            const candidates = await Candidate.find({ hire: 0 });
            res.status(200).send(candidates)
        } catch (error) {
            return next(Error(error))
        }
    },
    async searchCandidates(req, res, next, hire = 0) {
        try {
            const regex = new RegExp(req.query.q || "", "i"); // "i" makes the search case-insensitive
            const candidates = await Candidate.find({
                $or: [{ fullName: regex }, { emailID: regex }],
                hire
            });
            res.status(200).send(candidates)
        } catch (error) {
            res.status(404).json({ message: "Problem", error })
        }
    },

    async getInterns(req, res, next) {
        try {
            const candidates = await Candidate.find({ hire: 1 });
            res.status(200).send(candidates)
        } catch (error) {
            return next(Error(error))
        }
    },

    // POST REQUESTS
    async addCandidate(req, res, next) {
        try {
            const candidate = await Candidate.create(req.body);
            res.status(200).json(candidate)
        } catch (error) {
            // createValidationError();
            // console.log(error)
            if (error.code == 11000) {
                res.status(404).json({ message: "EmailID Already Exists" })
            } else {
                console.log(Object.keys(error.errors))
                console.log(Object.values(error.errors))
                console.log(error.errors.age.properties.message)

                const listErrors = Object.keys(error.errors).map((key) => {
                    return error.errors[key].properties.message;
                })
                /* map, filter, reduce, forEach, for:in of */

                res.json(listErrors);
                // return next(createAPIError(404, error.errors))x
            }
        }
    },

    async candidateSelection(req, res, next) {
        let { candidateID, feedback, hire, hireDetails } = req.body;

        hire ??= 0; // sets default as 0

        if (!candidateID) {
            return res.status(404).json({ message: "candidateID and hire are required field" })
        }

        /* 
            candidateID: 640026e92700147b0ad515a4,
            feedback:{
                Communication Skills
                Collaborative Skills
                Experience
                Presentation Skills
                Problem Solving Skills
                Overall Feedback
            },
            
            hire: 0/1/-1,

            hireDetails:{ // not for rejection
                fromDate:
                toDate:
                isPaid:
                isStipend:
                amount:
            } */

        try {
            const candidate = await Candidate.findById(candidateID);
            if (!candidate) return res.status(404).json({ status: 'error', message: 'Candidate not found' });

            // update fields
            candidate.feedback = feedback ?? candidate.feedback;
            candidate.hireDetails = hireDetails ?? candidate.hireDetails;

            // handle hire status changes
            const prevHire = candidate.hire ?? 0;
            candidate.hire = hire ?? candidate.hire;

            // if newly hired (prev not 1 and now 1) increment hireCount
            if (prevHire !== 1 && candidate.hire === 1) {
                candidate.hireCount = (candidate.hireCount || 0) + 1;
            }

            // if rejected, optionally leave hireCount unchanged

            await candidate.save();

            let statusMsg = 'updated';
            if (candidate.hire === 1) statusMsg = 'hired';
            else if (candidate.hire === -1) statusMsg = 'rejected';

            return res.status(200).json({ status: statusMsg, message: `candidate ${statusMsg}`, candidate });
        } catch (error) {
            console.log(error);
            res.status(500).json({ status: 'error', message: 'problem to update candidate', error: error.message })
        }
    },
    async assignBadge(req, res, next) {
        try {
            const { candidateID, badgeName, points, assignedBy } = req.body;
            if (!candidateID || !badgeName) return res.status(400).json({ message: "candidateID and badgeName required" });

            const candidate = await Candidate.findById(candidateID);
            if (!candidate) return res.status(404).json({ message: "Candidate not found" });

            const badge = { name: badgeName, points: Number(points) || 0, assignedBy: assignedBy || "manager" };
            candidate.badges.push(badge);
            candidate.xp = (candidate.xp || 0) + (Number(points) || 0);
            await candidate.save();

            res.status(200).json(candidate);
        } catch (error) {
            console.log(error);
            res.status(500).json({ message: error.message });
        }
    },

    async generateCertificate(req, res, next) {
        try {
            const candidateID = req.params.id;
            const candidate = await Candidate.findById(candidateID);
            if (!candidate) return res.status(404).json({ message: "Candidate not found" });
            const PDFDocument = require('pdfkit');

            // create output directory
            const outDir = path.join(__dirname, '..', 'generated_certificates');
            if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

            const doc = new PDFDocument({ size: 'A4', margin: 50 });
            let buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers);
                // save file for later download
                const filename = `certificate_${candidate.fullName.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
                const filePath = path.join(outDir, filename);
                try {
                    fs.writeFileSync(filePath, pdfData);
                } catch (e) {
                    console.log('Failed to save certificate file:', e.message);
                }

                const base64 = pdfData.toString('base64');
                if (req.query.download === '1') {
                    res.setHeader('Content-Type', 'application/pdf');
                    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
                    res.send(pdfData);
                } else {
                    res.json({ pdfBase64: base64, savedAs: `/generated_certificates/${filename}` });
                }
            });

            // Optional logo: try project public logo locations
            const possibleLogos = [
                path.join(__dirname, '..', '..', 'internship-management', 'public', 'logo.png'),
                path.join(__dirname, '..', '..', 'internship-management', 'public', 'favicon.ico'),
                path.join(__dirname, '..', 'logo.png')
            ];
            let logoPath = null;
            for (const p of possibleLogos) {
                if (fs.existsSync(p)) {
                    logoPath = p;
                    break;
                }
            }

            // Layout: border
            const pageWidth = doc.page.width;
            const pageHeight = doc.page.height;
            const margin = 36;
            doc.rect(margin / 2, margin / 2, pageWidth - margin, pageHeight - margin).stroke('#cccccc');

            // draw logo if available
            if (logoPath) {
                try {
                    doc.image(logoPath, (pageWidth / 2) - 40, 70, { width: 80 });
                } catch (e) {
                    // ignore image errors
                }
            }

            doc.fontSize(20).fillColor('#000').text('Certificate of Internship Completion', { align: 'center', underline: false });
            doc.moveDown(1);
            doc.fontSize(12).text('This is to certify that', { align: 'center' });
            doc.moveDown(0.5);
            doc.font('Times-Bold').fontSize(26).text(candidate.fullName, { align: 'center' });
            doc.font('Times-Roman');
            doc.moveDown(0.5);

            const from = candidate.hireDetails?.fromDate || 'N/A';
            const to = candidate.hireDetails?.toDate || 'N/A';
            doc.fontSize(12).text(`has successfully completed the internship from ${from} to ${to}.`, { align: 'center' });

            doc.moveDown(1);
            // Achievements box
            if (candidate.badges && candidate.badges.length) {
                doc.fontSize(14).text('Achievements', { underline: true, align: 'left' });
                doc.moveDown(0.4);
                candidate.badges.forEach((b) => {
                    doc.fontSize(12).text(`• ${b.name} — ${b.points} XP (by ${b.assignedBy} on ${b.date})`, { continued: false });
                });
            } else {
                doc.fontSize(12).text('Achievements: -', { align: 'left' });
            }

            doc.moveDown(3);
            // Signature area (try common locations for a signature image)
            const possibleSigs = [
                path.join(__dirname, '..', '..', 'internship-management', 'public', 'signature.png'),
                path.join(__dirname, '..', 'signature.png')
            ];
            let sigPath = null;
            for (const p of possibleSigs) {
                if (fs.existsSync(p)) {
                    sigPath = p; break;
                }
            }

            const sigX = pageWidth - 200;
            const sigY = pageHeight - 200;
            if (sigPath) {
                try {
                    doc.image(sigPath, sigX, sigY - 20, { width: 120 });
                } catch (e) { }
            } else {
                // draw signature line
                doc.moveTo(sigX, sigY).lineTo(sigX + 140, sigY).stroke();
            }

            const supervisorName = candidate.hireDetails?.supervisor || req.query.supervisor || 'Supervisor';
            doc.fontSize(12).text(supervisorName, sigX, sigY + 8, { width: 140, align: 'center' });
            doc.fontSize(10).text('Supervisor', sigX, sigY + 24, { width: 140, align: 'center' });

            // footer date
            const today = new Date().toLocaleDateString();
            doc.fontSize(10).text(`Date: ${today}`, margin, pageHeight - margin - 20);

            doc.end();

        } catch (error) {
            console.log(error);
            res.status(500).json({ message: error.message });
        }
    }
}

module.exports = controller;