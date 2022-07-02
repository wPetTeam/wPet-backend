import { checkDate, checkLastDateIsLessToday } from "../validations/validate";
import {
  dbInsertShowerDueDateTodolist,
  dbInsertTodolist,
} from "../../db/todolist.db/create_delete_todolist.db";

import { CreateShowerDTO } from "../../types/shower";
import { Response } from "express-serve-static-core";
import { dbCheckPetExist } from "../../db/pet.db/create_delete_pet.db";
import { dbInsertPetShowerData } from "../../db/shower.db/register_shower.db";
import { dbSelectPetShowerData } from "../../db/shower.db/infor_shower.db";

export const registerShowerData = (
  userID: number,
  showerData: CreateShowerDTO,
  res: Response<any, Record<string, any>, number>
) => {
  // 샤워 데이터 등록
  // userID의 유저가 등록한 pet들 중 pet 존재하는지 검증
  dbCheckPetExist(
    userID,
    showerData.petID,
    function (success, result, err, msg) {
      if (!success && err) {
        return res.status(404).json({ code: "SQL ERROR", errorMessage: err });
      }
      // 사용자가 등록한 pet의 petID가 아닌 경우
      else if (!success && !err) {
        return res.status(404).json({ code: "NOT FOUND", errorMessage: msg });
      }
      // 사용자의 반려견이 맞는 경우
      else {
        // 요청 데이터 유효성 검증 (마지막 샤워일)
        if (
          !checkDate(showerData.lastDate) ||
          !checkLastDateIsLessToday(showerData.lastDate)
        ) {
          let errArr: Array<string> = [];
          if (!checkDate(showerData.lastDate)) errArr.push("DATE FORMAT");
          if (!checkLastDateIsLessToday(showerData.lastDate))
            errArr.push("LAST DATE IS BIGGER THAN TODAY");

          return res.status(400).json({
            code: "INVALID FORMAT ERROR",
            errorMessage: `INVALID FORMAT : [${errArr}]`,
          });
        } else {
          // 반려견이 이미 등록한 shower data 없는지 검증
          dbSelectPetShowerData(
            "petID",
            showerData.petID,
            function (success, err, isShowerData, dbShowerData) {
              if (!success) {
                return res
                  .status(404)
                  .json({ code: "SQL ERROR", errorMessage: err });
              } else if (isShowerData) {
                // 이미 shower data 존재
                return res.status(409).json({
                  code: "CONFLICT ERROR",
                  errorMessage: `PET IS ALREADY REGISTERED SHOWER INFO`,
                });
              } else {
                // shower data 없음
                // shower table DB에 저장
                dbInsertPetShowerData(
                  showerData,
                  function (success, err, showerID) {
                    if (!success) {
                      return res
                        .status(404)
                        .json({ code: "SQL ERROR", errorMessage: err });
                    } else if (showerID !== undefined) {
                      // todolist table DB에도 저장
                      dbInsertShowerDueDateTodolist(
                        showerData.petID,
                        showerID,
                        function (success, err) {
                          if (!success) {
                            return res
                              .status(404)
                              .json({ code: "SQL ERROR", errorMessage: err });
                          }
                          res.status(201).json({ success: true });
                        }
                      );
                    }
                  }
                );
              }
            }
          );
        }
      }
    }
  );
};
