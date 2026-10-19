
import { expect } from "chai";
import { network } from "hardhat";

interface Question {
  question: string;
  options: string[];
}

describe("Survey init", () => {
  const title = "막무가내 설문조사라면";
  const description =
    "중앙화된 설문조사로서, 모든 데이터는 공개되지 않으며 설문조사를 게시한자만 볼 수 있습니다.";
  const questions: Question[] = [
    {
      question: "누가 내 응답을 관리할때 더 솔직할 수 있을까요?",
      options: [
        "구글폼 운영자",
        "탈중앙화된 블록체인 (관리주체 없으며 모든 데이터 공개)",
        "상관없음",
      ],
    },
  ];

  const getSurveyContractAndEthers = async (survey: {
    title: string;
    description: string;
    targetNumber: number;
    questions: Question[];
  }) => {
    const { ethers } = await network.connect();
    const cSurvey = await ethers.deployContract("Survey", [
      survey.title,
      survey.description,
      survey.targetNumber,
      survey.questions,
    ]);
    return { ethers, cSurvey };
  };

  describe("Deployment", () => {
    it("should store survey info correctly", async () => {
      const targetNumber = 10;
      const { cSurvey } = await getSurveyContractAndEthers({
        title,
        description,
        targetNumber,
        questions,
      });

      expect(await cSurvey.title()).to.equal(title);
      expect(await cSurvey.description()).to.equal(description);
      expect(await cSurvey.targetNumber()).to.equal(BigInt(targetNumber));
    });

    it("should calculate rewardAmount correctly", async () => {
      const targetNumber = 10;
      const { ethers } = await network.connect();
      const ethValue = ethers.parseEther("1");

      const cSurvey = await ethers.deployContract(
        "Survey",
        [title, description, targetNumber, questions],
        { value: ethValue },
      );

      const rewardAmount = await cSurvey.rewardAmount();
      expect(rewardAmount).to.equal(ethValue / BigInt(targetNumber));
    });
  });

  describe("Questions and Answers", () => {
    it("should return questions correctly", async () => {
      const targetNumber = 5;
      const { cSurvey } = await getSurveyContractAndEthers({
        title,
        description,
        targetNumber,
        questions,
      });

      const retrievedQuestions = await cSurvey.getQuestions();

      expect(retrievedQuestions).to.have.lengthOf(questions.length);
      expect(retrievedQuestions[0].question).to.equal(questions[0].question);
      expect([...retrievedQuestions[0].options]).to.deep.equal(
        questions[0].options,
      );
    });

    it("should allow valid answer submission", async () => {
      const targetNumber = 5;
      const { ethers, cSurvey } = await getSurveyContractAndEthers({
        title,
        description,
        targetNumber,
        questions,
      });

      const [signer] = await ethers.getSigners();
      const answer = {
        respondent: signer.address,
        answers: [0],
      };

      await cSurvey.submitAnswer(answer);

      const retrievedAnswers = await cSurvey.getAnswers();
      expect(retrievedAnswers).to.have.lengthOf(1);
      expect(retrievedAnswers[0].respondent).to.equal(signer.address);
      expect([...retrievedAnswers[0].answers]).to.deep.equal([0n]);
    });

    it("should revert if answer length mismatch", async () => {
      const targetNumber = 5;
      const { ethers, cSurvey } = await getSurveyContractAndEthers({
        title,
        description,
        targetNumber,
        questions,
      });

      const [signer] = await ethers.getSigners();
      const answer = {
        respondent: signer.address,
        answers: [0, 1],
      };

      await expect(cSurvey.submitAnswer(answer)).to.be.revertedWith(
        "Mismatched ansewers length",
      );
    });

    it("should revert if target reached", async () => {
      const targetNumber = 2;
      const { ethers, cSurvey } = await getSurveyContractAndEthers({
        title,
        description,
        targetNumber,
        questions,
      });

      const [signer1, signer2, signer3] = await ethers.getSigners();

      await cSurvey.submitAnswer({
        respondent: signer1.address,
        answers: [0],
      });

      await cSurvey.submitAnswer({
        respondent: signer2.address,
        answers: [1],
      });

      await expect(
        cSurvey.submitAnswer({
          respondent: signer3.address,
          answers: [0],
        }),
      ).to.be.revertedWith("This survey has been ended");
    });
  });

  describe("Rewards", () => {
    it("should pay correct reward to respondent", async () => {
      const targetNumber = 5;
      const { ethers } = await network.connect();
      const ethValue = ethers.parseEther("1");

      const cSurvey = await ethers.deployContract(
        "Survey",
        [title, description, targetNumber, questions],
        { value: ethValue },
      );

      const [signer1] = await ethers.getSigners();
      const initialBalance = await ethers.provider.getBalance(signer1.address);

      const answer = {
        respondent: signer1.address,
        answers: [0],
      };

      const tx = await cSurvey.submitAnswer(answer);
      const receipt = await tx.wait();

      if (!receipt) {
        throw new Error("Transaction receipt is null");
      }

      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      const finalBalance = await ethers.provider.getBalance(signer1.address);
      const expectedReward = ethValue / BigInt(targetNumber);
      const actualReward = finalBalance + gasUsed - initialBalance;

      expect(actualReward).to.equal(expectedReward);
    });
  });
});
