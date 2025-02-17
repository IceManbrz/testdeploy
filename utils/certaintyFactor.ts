import prisma from "@/prisma";

type TUserInputData = {
  [key: string]: number;
};
type TRules<T = {}> = {
  id: number;
  pestAndDeseaseCode: number;
  symptomCode: number;
  expertCF: number;
  ketentuan: {
    code: number;
    info: string;
    imageUrl: string;
    createdAt: Date;
    updatedAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
} & T;
type TData<T = {}, Rules = {}> = {
  code: number;
  name: string;
  imageUrl: string;
  createdAt: Date;
  updatedAt: Date;
  solution: string;
  activeIngredients: string;
  Rules: TRules<Rules>[];
} & T;

export type TKnowledgeBase = TData;
export type TMixedKnowledgeBaseWithUserCFInput = TData<{}, { userCF: number }>;
export type TCalculatedSingleRuleCF = TData<
  {
    calculatedSingleRuleCF: number[];
  },
  { userCF: number }
>;
export type TCalculatedCombinationRuleCF = TData<
  {
    calculatedSingleRuleCF: number[];
    calculatedCombinationRuleCF: number[];
    finalCF: number;
  },
  { userCF: number }
>;
export type TConclusion = TCalculatedCombinationRuleCF;

interface ICertaintyFactor {
  userInputData: TUserInputData;
  knowledgeBase: TKnowledgeBase[];
  calculatedSingleRuleCF: TCalculatedSingleRuleCF[];
  calculatedCombinationRuleCF: TCalculatedCombinationRuleCF[];
  conclusion: TConclusion[];
  generateKnowledgeBase(): Promise<this>;
  mixKnowledgeBaseWithUserCFInput(): Promise<this>;
  calculateSingleRuleCF(): Promise<this>;
  calculateCombinationRule(): Promise<this>;
  generateConclusion(): Promise<this>;
}

export default class CertaintyFactor implements ICertaintyFactor {
  private _userInputData: any;
  private _knowledgeBase: any;
  private _calculatedSingleRuleCF: any;
  private _calculatedCombinationRuleCF: any;
  private _conclusion: any;

  constructor(userInputData = {}) {
    this._userInputData = userInputData;
  }

  get userInputData() {
    return this._userInputData;
  }

  get knowledgeBase() {
    return this._knowledgeBase;
  }

  get calculatedSingleRuleCF() {
    return this._calculatedSingleRuleCF;
  }

  get calculatedCombinationRuleCF() {
    return this._calculatedCombinationRuleCF;
  }

  get conclusion() {
    return this._conclusion;
  }

  async generateKnowledgeBase() {
    const data = await prisma.jurusan.findMany({
      include: {
        Rules: {
          include: {
            ketentuan: true,
          },
        },
      },
    });

    await prisma.$disconnect();

    this._knowledgeBase = data;
    return this;
  }

  async mixKnowledgeBaseWithUserCFInput() {
    const knowledgeBase: TKnowledgeBase[] = (await this.generateKnowledgeBase())
      .knowledgeBase;

    const knowledgeBaseRuleWithUserInputData = knowledgeBase.map((rule) => {
      const { Rules } = rule;

      const RulesWithInjectedUserCF =
      Rules.map((item) => {
          const {
            ketentuan: { code },
          } = item;
          const userCF = this._userInputData[code];

          return {
            ...item,
            userCF,
          };
        });

      return {
        ...rule,
        Rules:
          RulesWithInjectedUserCF,
      };
    });

    this._knowledgeBase = knowledgeBaseRuleWithUserInputData;
    return this;
  }

  async calculateSingleRuleCF() {
    const knowledgeBase: TMixedKnowledgeBaseWithUserCFInput[] = (
      await this.mixKnowledgeBaseWithUserCFInput()
    ).knowledgeBase;

    const calculatedSingleRule = knowledgeBase.map((rule) => {
      const { Rules } = rule;

      if (Rules.length === 1) {
        const { userCF, expertCF } = Rules[0];
        const CF = userCF * expertCF;

        return {
          ...rule,
          calculatedSingleRuleCF: [CF],
        };
      }

      const calculatedSingleRuleCF = Rules.map(
        ({ userCF, expertCF }) => {
          const CF = userCF * expertCF;
          return CF;
        }
      );

      return {
        ...rule,
        calculatedSingleRuleCF,
      };
    });

    this._calculatedSingleRuleCF = calculatedSingleRule;
    return this;
  }

  async calculateCombinationRule() {
    const calculatedSingleRuleCF: TCalculatedSingleRuleCF[] = (
      await this.calculateSingleRuleCF()
    ).calculatedSingleRuleCF;

    const combinationRule = calculatedSingleRuleCF.map((rule) => {
      const { calculatedSingleRuleCF, name } = rule;

      let finalCF = 0;
      const calculatedCombinationRuleCF: number[] = [];

      switch (calculatedSingleRuleCF.length) {
        // 1. CF[H,E] cannot be combined with next CF
        case 1:
          finalCF = calculatedSingleRuleCF[0];
          break;

        case 2:
          // 2. CF[H,E] cannot be combined with old CF
          // CF[H,E]1,2 = CF[H,E]1 * CF[H,E]2 (1 - CF[H,E]1)
          finalCF =
            calculatedSingleRuleCF[0] +
            calculatedSingleRuleCF[1] * (1 - calculatedSingleRuleCF[0]);
          break;

        default:
          if (calculatedSingleRuleCF.length > 2) {
            calculatedSingleRuleCF.reduce((prevCF, currentCF) => {
              const newCombinationCF = currentCF + prevCF * (1 - currentCF);
              calculatedCombinationRuleCF.push(newCombinationCF);
              finalCF = newCombinationCF;
              return newCombinationCF;
            });
          } else {
            throw new Error(
              `"${name}" jurusan has ${calculatedSingleRuleCF.length} rules records`,
              {
                cause: `"${name}" jurusan needs at least 1 rules record`,
              }
            );
          }
      }

      return {
        ...rule,
        calculatedCombinationRuleCF,
        finalCF,
      };
    });

    this._calculatedCombinationRuleCF = combinationRule;
    return this;
  }

  async generateConclusion() {
    const calculatedCombinationRuleCF: TCalculatedCombinationRuleCF[] = (
      await this.calculateCombinationRule()
    ).calculatedCombinationRuleCF;

    const getHighestFinalCF = calculatedCombinationRuleCF.reduce(
      (prev, current) => (prev.finalCF > current.finalCF ? prev : current),
      { finalCF: 0 }
    );

    this._conclusion = getHighestFinalCF;
    return this;
  }
}
