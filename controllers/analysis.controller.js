const Analysis = require("../models/Analysis");

exports.getAnalysisBySubmissionId = async (req, res) => {
  try {
    const { submissionId } = req.params;

    const analysis = await Analysis.findOne({ submissionId });

    if (!analysis) {
      return res.status(404).json({ message: "Analysis not found" });
    }

    res.json(analysis);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};