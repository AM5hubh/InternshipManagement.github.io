const { createAPIError } = require("../errors/CustomeAPIError");
const Candidate = require("../models/Candidate");
const fs = require("fs");
const path = require("path");

const controller = {
  // GET REQUESTS
  async getCandidates(req, res, next) {
    try {
      const candidates = await Candidate.find({ hire: 0 });
      res.status(200).send(candidates);
    } catch (error) {
      return next(Error(error));
    }
  },
  async searchCandidates(req, res, next, hire = 0) {
    try {
      const regex = new RegExp(req.query.q || "", "i"); // "i" makes the search case-insensitive
      const candidates = await Candidate.find({
        $or: [{ fullName: regex }, { emailID: regex }],
        hire,
      });
      res.status(200).send(candidates);
    } catch (error) {
      res.status(404).json({ message: "Problem", error });
    }
  },

  async getInterns(req, res, next) {
    try {
      const candidates = await Candidate.find({ hire: 1 });
      res.status(200).send(candidates);
    } catch (error) {
      return next(Error(error));
    }
  },

  // POST REQUESTS
  async addCandidate(req, res, next) {
    try {
      const candidate = await Candidate.create(req.body);
      res.status(200).json(candidate);
    } catch (error) {
      // createValidationError();
      // console.log(error)
      if (error.code == 11000) {
        res.status(404).json({ message: "EmailID Already Exists" });
      } else {
        console.log(Object.keys(error.errors));
        console.log(Object.values(error.errors));
        // console.log(error.errors.age.properties.message);

        const listErrors = Object.keys(error.errors).map((key) => {
          return error.errors[key].properties.message;
        });
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
      return res
        .status(404)
        .json({ message: "candidateID and hire are required field" });
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
      if (!candidate)
        return res
          .status(404)
          .json({ status: "error", message: "Candidate not found" });

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

      let statusMsg = "updated";
      if (candidate.hire === 1) statusMsg = "hired";
      else if (candidate.hire === -1) statusMsg = "rejected";

      return res.status(200).json({
        status: statusMsg,
        message: `candidate ${statusMsg}`,
        candidate,
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({
        status: "error",
        message: "problem to update candidate",
        error: error.message,
      });
    }
  },
  async assignBadge(req, res, next) {
    try {
      const { candidateID, badgeName, points, assignedBy } = req.body;
      if (!candidateID || !badgeName)
        return res
          .status(400)
          .json({ message: "candidateID and badgeName required" });

      const candidate = await Candidate.findById(candidateID);
      if (!candidate)
        return res.status(404).json({ message: "Candidate not found" });

      const badge = {
        name: badgeName,
        points: Number(points) || 0,
        assignedBy: assignedBy || "manager",
      };
      candidate.badges.push(badge);

      // Add XP and track in history
      const xpPoints = Number(points) || 0;
      candidate.xp = (candidate.xp || 0) + xpPoints;
      candidate.xpHistory.push({
        points: xpPoints,
        source: "badge",
        sourceId: badge.name,
        description: `Badge awarded: ${badgeName}`,
        awardedBy: assignedBy || "manager",
      });

      await candidate.save();

      res.status(200).json(candidate);
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: error.message });
    }
  },

  async awardXP(req, res, next) {
    try {
      const { candidateID, points, reason, awardedBy } = req.body;
      if (!candidateID || !points)
        return res
          .status(400)
          .json({ message: "candidateID and points required" });

      const candidate = await Candidate.findById(candidateID);
      if (!candidate)
        return res.status(404).json({ message: "Candidate not found" });

      const xpPoints = Number(points);
      candidate.xp = (candidate.xp || 0) + xpPoints;
      candidate.xpHistory.push({
        points: xpPoints,
        source: "manual",
        description: reason || "Manual XP award",
        awardedBy: awardedBy || "manager",
      });

      await candidate.save();
      res.status(200).json({ message: "XP awarded successfully", candidate });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: error.message });
    }
  },

  async getLeaderboard(req, res, next) {
    try {
      const { department, period } = req.query;
      // Include both hired interns (hire: 1) and candidates with no decision (hire: 0)
      // who have earned XP, but exclude rejected candidates (hire: -1)
      let matchFilter = {
        hire: { $in: [0, 1] }, // Include undecided and hired
        xp: { $gt: 0 }, // Only show those who have earned XP
      };

      if (department) {
        matchFilter.department = department;
      }

      // For period filtering, we'd need to calculate based on xpHistory dates
      // For now, showing all-time leaderboard
      const leaderboard = await Candidate.find(matchFilter)
        .select(
          "firstName lastName fullName email xp badges xpHistory department hire"
        )
        .sort({ xp: -1 })
        .limit(100);

      // Add rank to each candidate
      const rankedLeaderboard = leaderboard.map((candidate, index) => ({
        ...candidate.toObject(),
        rank: index + 1,
        badgeCount: candidate.badges ? candidate.badges.length : 0,
        status: candidate.hire === 1 ? "Hired" : "Candidate",
      }));

      console.log(
        `Leaderboard found ${rankedLeaderboard.length} interns/candidates with XP`
      );
      res.status(200).json(rankedLeaderboard);
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: error.message });
    }
  },

  async generateCertificate(req, res, next) {
    try {
      const candidateID = req.params.id;
      const candidate = await Candidate.findById(candidateID);
      if (!candidate)
        return res.status(404).json({ message: "Candidate not found" });
      const PDFDocument = require("pdfkit");

      // create output directory
      const outDir = path.join(__dirname, "..", "generated_certificates");
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

      const doc = new PDFDocument({ size: "A4", margin: 50 });
      let buffers = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => {
        const pdfData = Buffer.concat(buffers);
        // save file for later download
        const filename = `certificate_${candidate.fullName.replace(
          /\s+/g,
          "_"
        )}_${Date.now()}.pdf`;
        const filePath = path.join(outDir, filename);
        try {
          fs.writeFileSync(filePath, pdfData);
        } catch (e) {
          console.log("Failed to save certificate file:", e.message);
        }

        const base64 = pdfData.toString("base64");
        if (req.query.download === "1") {
          res.setHeader("Content-Type", "application/pdf");
          res.setHeader(
            "Content-Disposition",
            `attachment; filename="${filename}"`
          );
          res.send(pdfData);
        } else {
          res.json({
            pdfBase64: base64,
            savedAs: `/generated_certificates/${filename}`,
          });
        }
      });

      // Optional logo: try project public logo locations
      const possibleLogos = [
        path.join(
          __dirname,
          "..",
          "..",
          "internship-management",
          "public",
          "logo.png"
        ),
        path.join(
          __dirname,
          "..",
          "..",
          "internship-management",
          "public",
          "favicon.ico"
        ),
        path.join(__dirname, "..", "logo.png"),
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
      doc
        .rect(margin / 2, margin / 2, pageWidth - margin, pageHeight - margin)
        .stroke("#cccccc");

      // draw logo if available
      if (logoPath) {
        try {
          doc.image(logoPath, pageWidth / 2 - 40, 70, { width: 80 });
        } catch (e) {
          // ignore image errors
        }
      }

      doc
        .fontSize(20)
        .fillColor("#000")
        .text("Certificate of Internship Completion", {
          align: "center",
          underline: false,
        });
      doc.moveDown(1);
      doc.fontSize(12).text("This is to certify that", { align: "center" });
      doc.moveDown(0.5);
      doc
        .font("Times-Bold")
        .fontSize(26)
        .text(candidate.fullName, { align: "center" });
      doc.font("Times-Roman");
      doc.moveDown(0.5);

      const from = candidate.hireDetails?.fromDate || "N/A";
      const to = candidate.hireDetails?.toDate || "N/A";
      doc
        .fontSize(12)
        .text(
          `has successfully completed the internship from ${from} to ${to}.`,
          { align: "center" }
        );

      doc.moveDown(1);
      // Achievements box
      if (candidate.badges && candidate.badges.length) {
        doc
          .fontSize(14)
          .text("Achievements", { underline: true, align: "left" });
        doc.moveDown(0.4);
        candidate.badges.forEach((b) => {
          doc
            .fontSize(12)
            .text(
              `• ${b.name} — ${b.points} XP (by ${b.assignedBy} on ${b.date})`,
              { continued: false }
            );
        });
      } else {
        doc.fontSize(12).text("Achievements: -", { align: "left" });
      }

      doc.moveDown(3);
      // Signature area (try common locations for a signature image)
      const possibleSigs = [
        path.join(
          __dirname,
          "..",
          "..",
          "internship-management",
          "public",
          "signature.png"
        ),
        path.join(__dirname, "..", "signature.png"),
      ];
      let sigPath = null;
      for (const p of possibleSigs) {
        if (fs.existsSync(p)) {
          sigPath = p;
          break;
        }
      }

      const sigX = pageWidth - 200;
      const sigY = pageHeight - 200;
      if (sigPath) {
        try {
          doc.image(sigPath, sigX, sigY - 20, { width: 120 });
        } catch (e) {}
      } else {
        // draw signature line
        doc
          .moveTo(sigX, sigY)
          .lineTo(sigX + 140, sigY)
          .stroke();
      }

      const supervisorName =
        candidate.hireDetails?.supervisor ||
        req.query.supervisor ||
        "Supervisor";
      doc
        .fontSize(12)
        .text(supervisorName, sigX, sigY + 8, { width: 140, align: "center" });
      doc
        .fontSize(10)
        .text("Supervisor", sigX, sigY + 24, { width: 140, align: "center" });

      // footer date
      const today = new Date().toLocaleDateString();
      doc.fontSize(10).text(`Date: ${today}`, margin, pageHeight - margin - 20);

      doc.end();
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: error.message });
    }
  },

  // Badge assignment endpoint
  async assignBadge(req, res, next) {
    try {
      const { candidateID, badgeName, points, assignedBy } = req.body;

      if (!candidateID || !badgeName || !points) {
        return res.status(400).json({
          message: "candidateID, badgeName, and points are required fields",
        });
      }

      const candidate = await Candidate.findById(candidateID);
      if (!candidate) {
        return res.status(404).json({
          message: "Candidate not found",
        });
      }

      // Award badge and XP
      candidate.xp = (candidate.xp || 0) + points;
      candidate.xpHistory.push({
        points: points,
        source: "badge",
        sourceId: null,
        description: `Badge awarded: ${badgeName}`,
        awardedBy: assignedBy || req.user._id,
      });

      // Add badge to badges array if it doesn't exist
      if (!candidate.badges) {
        candidate.badges = [];
      }

      const existingBadge = candidate.badges.find((b) => b.name === badgeName);
      if (!existingBadge) {
        candidate.badges.push({
          name: badgeName,
          awardedDate: new Date().toISOString(),
          awardedBy: assignedBy || req.user._id,
        });
      }

      await candidate.save();

      res.status(200).json({
        message: "Badge awarded successfully",
        candidate: {
          id: candidate._id,
          name: candidate.fullName,
          totalXP: candidate.xp,
          badgeAwarded: badgeName,
          pointsAwarded: points,
        },
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: error.message });
    }
  },

  // Leaderboard endpoint
  async getLeaderboard(req, res, next) {
    try {
      const { department, period } = req.query;

      // Build match filter
      let matchFilter = { hire: 1 }; // Only hired interns
      if (department && department !== "all") {
        matchFilter.department = department;
      }

      // For period filtering, we'd need to filter xpHistory by date
      // For now, we'll return all-time leaderboard
      const candidates = await Candidate.find(matchFilter)
        .select(
          "firstName lastName fullName emailID xp xpHistory badges department"
        )
        .sort({ xp: -1 })
        .limit(100);

      // Format the leaderboard data
      const leaderboard = candidates.map((candidate, index) => {
        const level = Math.floor((candidate.xp || 0) / 100) + 1;
        const badgeCount = candidate.badges ? candidate.badges.length : 0;

        return {
          rank: index + 1,
          id: candidate._id,
          name:
            candidate.fullName ||
            `${candidate.firstName} ${candidate.lastName}`,
          email: candidate.emailID,
          xp: candidate.xp || 0,
          level: level,
          department: candidate.department || "Not specified",
          badgeCount: badgeCount,
          badges: candidate.badges || [],
        };
      });

      res.status(200).json(leaderboard);
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: error.message });
    }
  },

  // Manual XP Award endpoint
  async awardXP(req, res, next) {
    try {
      const { candidateID, points, reason, awardedBy } = req.body;

      if (!candidateID || !points) {
        return res.status(400).json({
          message: "candidateID and points are required fields",
        });
      }

      const candidate = await Candidate.findById(candidateID);
      if (!candidate) {
        return res.status(404).json({
          message: "Candidate not found",
        });
      }

      // Award XP
      candidate.xp = (candidate.xp || 0) + points;
      candidate.xpHistory.push({
        points: points,
        source: "manual",
        sourceId: null,
        description: reason || "Manual XP award",
        awardedBy: awardedBy || req.user._id,
      });

      await candidate.save();

      res.status(200).json({
        message: "XP awarded successfully",
        candidate: {
          id: candidate._id,
          name: candidate.fullName,
          totalXP: candidate.xp,
          pointsAwarded: points,
        },
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: error.message });
    }
  },
};

module.exports = controller;
