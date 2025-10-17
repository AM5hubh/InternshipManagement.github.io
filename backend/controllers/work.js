const Work = require("../models/Work");
const Candidate = require("../models/Candidate");

const controller = {
  async getWorks(req, res, next) {
    try {
      // const works = await Work.find().populate("assignTo._id");
      const works = await Work.find(); //.populate("assignTo._id");
      res.status(200).json(works);
    } catch (error) {
      console.log(error);
      res.status(404).json({ message: error.message });
    }
  },

  async addWork(req, res, next) {
    try {
      let { title, assignTo, priority, deadline, description, xpReward } =
        req.body;
      if (title && assignTo.length && deadline) {
        assignTo = assignTo.map((v) => {
          return { ...v, refType: v.type == "intern" ? "candidate" : "group" };
        });
        console.log(assignTo);
        const workData = { title, assignTo, priority, deadline, description };
        if (xpReward) workData.xpReward = Number(xpReward);
        if (req.body.bonusMultiplier)
          workData.bonusMultiplier = Number(req.body.bonusMultiplier);

        const work = await Work.create(workData);
        res.status(201).json(work);
      } else {
        console.log("requested");
        res.status(404).json({
          message:
            "{title, assignTo, priority, deadline, description} are required fields",
        });
      }
    } catch (error) {
      console.log(error);
      res.status(404).json({
        message: "Please Ensure sending correct details",
        error: error.message,
      });
    }
  },

  async completeWork(req, res, next) {
    try {
      const { workId } = req.params;
      const { completedBy, internId } = req.body;

      const work = await Work.findById(workId);
      if (!work) return res.status(404).json({ message: "Work not found" });

      // Mark work as completed
      const completionDate = new Date();
      work.status = 1;
      work.completionDate = completionDate.toLocaleString();
      work.completedBy = completedBy || req.user._id;

      // Award XP to assigned interns
      let xpAwardDetails = {
        baseXP: work.xpReward || 10,
        bonusXP: 0,
        totalXP: work.xpReward || 10,
        timingDescription: "No timing calculated",
        internsAwarded: [],
      };

      // Get all assigned interns from the work
      const assignedInterns =
        work.assignTo?.filter((assignment) => assignment.type === "intern") ||
        [];
      console.log("Assigned interns to this task:", assignedInterns);

      if (assignedInterns.length > 0) {
        // Calculate timing bonus (same for all interns)
        let bonusXP = 0;
        let timingDescription = "";

        try {
          const deadline = new Date(work.deadline);
          const timeDiff = deadline.getTime() - completionDate.getTime();
          const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

          if (daysDiff > 0) {
            const multiplier = work.bonusMultiplier || 1.0;
            let bonusRate = 0;

            if (daysDiff >= 7) {
              bonusRate = 0.5;
              timingDescription = `Completed ${daysDiff} days early (1+ week bonus)`;
            } else if (daysDiff >= 3) {
              bonusRate = 0.3;
              timingDescription = `Completed ${daysDiff} days early (3+ days bonus)`;
            } else if (daysDiff >= 1) {
              bonusRate = 0.15;
              timingDescription = `Completed ${daysDiff} days early (early completion bonus)`;
            } else {
              bonusRate = 0.05;
              timingDescription = "Completed on deadline day";
            }

            bonusXP = Math.floor(
              (work.xpReward || 10) * bonusRate * multiplier
            );
            if (multiplier !== 1.0) {
              timingDescription += ` (${multiplier}x multiplier)`;
            }
          } else if (daysDiff === 0) {
            timingDescription = "Completed on deadline";
          } else {
            timingDescription = `Completed ${Math.abs(daysDiff)} days late`;
          }
        } catch (dateError) {
          console.log("Date parsing error:", dateError);
          timingDescription = "Unable to calculate timing bonus";
        }

        // Award XP to ALL assigned interns
        for (const assignment of assignedInterns) {
          try {
            console.log(
              "Looking for assigned intern with ID:",
              assignment.id || assignment._id
            );
            const intern = await Candidate.findById(
              assignment.id || assignment._id
            );

            if (intern && (intern.hire === 1 || intern.hire === 0)) {
              console.log(
                "Awarding XP to assigned intern:",
                intern.fullName,
                "with hire status:",
                intern.hire
              );

              const totalXPForIntern = (work.xpReward || 10) + bonusXP;

              // Add base XP
              intern.xp = (intern.xp || 0) + (work.xpReward || 10);
              intern.xpHistory.push({
                points: work.xpReward || 10,
                source: "task",
                sourceId: workId,
                description: `Task completed: ${work.title}`,
                awardedBy: completedBy || req.user._id,
              });

              // Add bonus XP if applicable
              if (bonusXP > 0) {
                intern.xp += bonusXP;
                intern.xpHistory.push({
                  points: bonusXP,
                  source: "task_bonus",
                  sourceId: workId,
                  description: `Early completion bonus: ${work.title} - ${timingDescription}`,
                  awardedBy: completedBy || req.user._id,
                });
              }

              await intern.save();

              xpAwardDetails.internsAwarded.push({
                id: intern._id,
                name: intern.fullName,
                xpAwarded: totalXPForIntern,
              });

              console.log(
                "XP awarded successfully to:",
                intern.fullName,
                "Total XP:",
                totalXPForIntern
              );
            } else {
              console.log(
                "Cannot award XP to intern:",
                assignment.id || assignment._id,
                intern
                  ? `Intern rejected (hire === -1, current: ${intern.hire})`
                  : "Intern not found"
              );
            }
          } catch (internError) {
            console.error(
              "Error awarding XP to intern:",
              assignment.id || assignment._id,
              internError
            );
          }
        }

        // Update XP details for response
        xpAwardDetails.bonusXP = bonusXP;
        xpAwardDetails.totalXP = (work.xpReward || 10) + bonusXP;
        xpAwardDetails.timingDescription = timingDescription;
      } else if (internId) {
        // Fallback: if no assigned interns but internId provided (manual selection)
        console.log(
          "No assigned interns, using manual selection - Looking for intern with ID:",
          internId
        );
        const intern = await Candidate.findById(internId);
        console.log(
          "Found manually selected intern:",
          intern
            ? { id: intern._id, hire: intern.hire, name: intern.fullName }
            : "Not found"
        );

        if (intern && (intern.hire === 1 || intern.hire === 0)) {
          console.log(
            "Awarding XP to manually selected intern:",
            intern.fullName,
            "with hire status:",
            intern.hire
          );
          let totalXP = work.xpReward || 10;
          let bonusXP = 0;
          let timingDescription = "";

          // Calculate early completion bonus
          try {
            const deadline = new Date(work.deadline);
            const timeDiff = deadline.getTime() - completionDate.getTime();
            const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

            if (daysDiff > 0) {
              const multiplier = work.bonusMultiplier || 1.0;
              let bonusRate = 0;

              if (daysDiff >= 7) {
                bonusRate = 0.5;
                timingDescription = `Completed ${daysDiff} days early (1+ week bonus)`;
              } else if (daysDiff >= 3) {
                bonusRate = 0.3;
                timingDescription = `Completed ${daysDiff} days early (3+ days bonus)`;
              } else if (daysDiff >= 1) {
                bonusRate = 0.15;
                timingDescription = `Completed ${daysDiff} days early (early completion bonus)`;
              } else {
                bonusRate = 0.05;
                timingDescription = "Completed on deadline day";
              }

              bonusXP = Math.floor(totalXP * bonusRate * multiplier);
              if (multiplier !== 1.0) {
                timingDescription += ` (${multiplier}x multiplier)`;
              }
            } else if (daysDiff === 0) {
              timingDescription = "Completed on deadline";
            } else {
              timingDescription = `Completed ${Math.abs(daysDiff)} days late`;
            }
          } catch (dateError) {
            console.log("Date parsing error:", dateError);
            timingDescription = "Unable to calculate timing bonus";
          }

          // Add base XP
          intern.xp = (intern.xp || 0) + totalXP;
          intern.xpHistory.push({
            points: totalXP,
            source: "task",
            sourceId: workId,
            description: `Task completed: ${work.title}`,
            awardedBy: completedBy || req.user._id,
          });

          // Add bonus XP if applicable
          if (bonusXP > 0) {
            intern.xp += bonusXP;
            intern.xpHistory.push({
              points: bonusXP,
              source: "task_bonus",
              sourceId: workId,
              description: `Early completion bonus: ${work.title} - ${timingDescription}`,
              awardedBy: completedBy || req.user._id,
            });
          }

          await intern.save();

          // Update XP details for response
          xpAwardDetails.bonusXP = bonusXP;
          xpAwardDetails.totalXP = totalXP + bonusXP;
          xpAwardDetails.timingDescription = timingDescription;
          xpAwardDetails.internsAwarded.push({
            id: intern._id,
            name: intern.fullName,
            xpAwarded: totalXP + bonusXP,
          });

          console.log(
            "XP awarded successfully to manually selected intern:",
            intern.fullName,
            "Total XP:",
            totalXP + bonusXP
          );
        } else {
          console.log(
            "Cannot award XP to manually selected intern:",
            intern
              ? `Intern rejected (hire === -1, current: ${intern.hire})`
              : "Intern not found"
          );
        }
      } else {
        console.log("No interns specified for XP award");
      }

      // Add completion details to response
      work._doc.xpAwarded = xpAwardDetails.totalXP;
      work._doc.bonusXP = xpAwardDetails.bonusXP;
      work._doc.timingDescription = xpAwardDetails.timingDescription;

      await work.save();
      res.status(200).json({
        message: "Work completed successfully",
        work,
        xpDetails: xpAwardDetails,
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: error.message });
    }
  },
};

module.exports = controller;
