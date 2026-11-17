import 'server-only';
import {cache} from 'react';
import {db} from './db';
import {getPartnerMissionBoard} from './partner-mission-store';

// One reconciliation per authenticated request, shared by the layout and page.
export const partnerMissionBoard=cache(async(coupleId:string,userId:string,partnerId:string)=>
  getPartnerMissionBoard(db(),{coupleId,userId,partnerId}));
