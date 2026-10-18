
import { expect } from 'chai';

import { network } from 'hardhat';

describe("SurveyFactory Contract", () => {

let factory: any;
let owner: any;
let respondent1: any;
let respondent2: any;
  beforeEach(async () => {
    const { ethers } = await network.connect();

    [owner, respondent1, respondent2] = await ethers.getSigners();

    factory = await ethers.deployContract("SurveyFactory", [
      ethers.parseEther("50"), // min_pool_amount
      ethers.parseEther("0.1"), // min_reward_amount
    ]);

  });

  it("should deploy with correct minimum amounts", async () => {

    const { ethers } = await network.connect();

    const questions = [
      {
        question: "테스트 질문",
        options: ["예", "아니오"],
      },
    ];

    // 최소 pool 금액인 50 ETH보다 적으면 실패해야 함
    await expect(
      factory.createSurvey(
        {
          title: "Test Survey",
          description: "Test Description",
          targetNumber: 100,
          questions
        },
        { value: ethers.parseEther("49") }
      )
    ).to.be.revertedWith("Insufficient pool amount");

    // 최소 pool 금액인 50 ETH에서는 생성 성공
    await factory.createSurvey(
      {
        title: "Test Survey",
        description: "Test Description",
        targetNumber: 500,
        questions
      },
      { value: ethers.parseEther("50") }
    );

    const surveys = await factory.getSurveys();

    expect(surveys.length).to.equal(1);

  });

  it("should create a new survey when valid values are provided", async () => {

    const { ethers } = await network.connect();

    const questions = [
      {
        question: "누가 내 응답을 관리할 때 더 솔직할 수 있을까요?",
        options: [
          "구글폼 운영자",
          "탈중앙화된 블록체인(관리주체 없으며 모든 데이터 공개)",
          "상관없음"
        ],
      },
    ];

    const tx = await factory.createSurvey(
      {
        title: "막무가내 설문조사",
        description: "중앙화된 설문조사로서, 모든 데이터는 공개되지 않으며 설문조사를 게시한 자만 볼 수 있습니다.",
        targetNumber: 100,
        questions
      },
      { value: ethers.parseEther("100") }
    );

    await expect(tx).to.emit(factory, "SurveyCreated");

    const surveys = await factory.getSurveys();

    expect(surveys.length).to.equal(1);

  });

  it("should revert if pool amount is too small", async () => {

    const { ethers } = await network.connect();

    const questions = [
      {
        question: "테스트 질문",
        options: ["예", "아니오"],
      },
    ];

    await expect(
      factory.createSurvey(
        {
          title: "Test Survey",
          description: "Test Description",
          targetNumber: 100,
          questions
        },
        { value: ethers.parseEther("49") }
      )
    ).to.be.revertedWith("Insufficient pool amount");

  });

  it("should revert if reward amount per respondent is too small", async () => {

    const { ethers } = await network.connect();

    const questions = [
      {
        question: "테스트 질문",
        options: ["예", "아니오"],
      },
    ];

    // 50 ETH / 501명 < 0.1 ETH
    await expect(
      factory.createSurvey(
        {
          title: "Test Survey",
          description: "Test Description",
          targetNumber: 501,
          questions
        },
        { value: ethers.parseEther("50") }
      )
    ).to.be.revertedWith("Insufficient reward amount");

  });

  it("should store created surveys and return them from getSurveys", async () => {

    const { ethers } = await network.connect();

    const questions = [
      {
        question: "테스트 질문",
        options: ["예", "아니오"],
      },
    ];

    await factory.createSurvey(
      {
        title: "Survey 1",
        description: "First Survey",
        targetNumber: 100,
        questions
      },
      { value: ethers.parseEther("100") }
    );

    await factory.createSurvey(
      {
        title: "Survey 2",
        description: "Second Survey",
        targetNumber: 100,
        questions
      },
      { value: ethers.parseEther("100") }
    );

    const surveys = await factory.getSurveys();

    expect(surveys.length).to.equal(2);
    expect(surveys[0]).to.not.equal(surveys[1]);

  });

});