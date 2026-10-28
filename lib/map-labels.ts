import {Converter} from 'opencc-js/t2cn';

let simplify:ReturnType<typeof Converter>|undefined;
const hans=(value:string)=>(simplify??=Converter({from:'t',to:'cn'}))(value);
const aliases=(value:string)=>value.split(/[;；]/).map(v=>hans(v.trim())).filter(Boolean);
const clean=(value:string)=>aliases(value)[0]??'';

/** Prefer provider-supplied Chinese names; preserve official local spellings when none exist. */
export function simplifiedAddress(row:Record<string,unknown>):string {
  let display=typeof row.display_name==='string'?row.display_name:'';
  const names=row.namedetails as Record<string,unknown>|undefined;
  const preferred=names&&['name:zh-Hans','name:zh-CN','name:zh'].map(key=>names[key]).find(v=>typeof v==='string'&&v.trim());
  if(typeof preferred==='string'&&typeof row.name==='string'&&row.name)display=display.replace(row.name,clean(preferred));
  const parts=display.split(/[,，]/).map(clean).filter(Boolean);
  const address=row.address as Record<string,unknown>|undefined;
  if(address&&typeof address.country_code==='string'&&/^[a-z]{2}$/i.test(address.country_code)){
    const country=new Intl.DisplayNames(['zh-Hans'],{type:'region'}).of(address.country_code.toUpperCase());
    if(country){
      const previous=typeof address.country==='string'?clean(address.country):'';
      const index=parts.findIndex(part=>part===previous);
      if(index>=0)parts[index]=country;else if(!parts.includes(country))parts.push(country);
    }
  }
  return [...new Set(parts)].join('，');
}

/** Keep results to Address, Town/City, State, Zip. */
export function formatAddress(row:Record<string,unknown>,lang:'en'|'zh'):string {
  const label=lang==='zh'?simplifiedAddress(row):typeof row.display_name==='string'?row.display_name.trim():'';
  const parts=label.split(/[,，]/).map(part=>part.trim()).filter(Boolean);
  const address=row.address&&typeof row.address==='object'?row.address as Record<string,unknown>:{};
  const value=(v:unknown)=>typeof v==='string'?(lang==='zh'?clean(v):v.trim()):'';
  const house=value(address.house_number);
  const road=['road','pedestrian','residential','street'].map(key=>value(address[key])).find(Boolean)??'';
  const town=['city','town','village','hamlet','municipality','suburb'].map(key=>value(address[key])).find(Boolean)??'';
  const state=value(address.state),postcode=value(address.postcode);
  if(road||town||state||postcode){
    const first=parts[0]??'';
    const place=[town,state,postcode,value(address.county),value(address.country)].includes(first)?'':first;
    const street=road&&house?(lang==='zh'&&/[\u3400-\u9fff]/.test(road)?`${road}${house}${/号$/.test(house)?'':'号'}`:`${house} ${road}`):road||place;
    return [street,town,state,postcode].filter(Boolean).filter((part,i,all)=>all.indexOf(part)===i).join(lang==='zh'?'，':', ');
  }
  // Be tolerant of older/cached responses that do not contain structured address fields.
  const street=/(?:\b(?:street|st|road|rd|drive|dr|avenue|ave|lane|ln|boulevard|blvd|court|ct|way|place|pl|terrace|ter|circle|cir|pike|highway|hwy)\.?$|[路街巷弄道]$)/i;
  for(let i=0;i<parts.length-1;i++)if(/^\d[\dA-Za-z /-]{0,12}$/.test(parts[i])&&street.test(parts[i+1])){
    parts.splice(i,2,lang==='zh'&&/[\u3400-\u9fff]/.test(parts[i+1])?`${parts[i+1]}${parts[i]}号`:`${parts[i]} ${parts[i+1]}`);
  }
  const country=value(address.country);
  const localizedCountry=lang==='zh'&&typeof address.country_code==='string'&&/^[a-z]{2}$/i.test(address.country_code)?new Intl.DisplayNames(['zh-Hans'],{type:'region'}).of(address.country_code.toUpperCase()):'';
  return parts.filter(part=>part!==country&&part!==localizedCountry&&part!==value(address.county)).slice(0,4).join(lang==='zh'?'，':', ');
}
