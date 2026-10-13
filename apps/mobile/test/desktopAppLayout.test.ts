import assert from "node:assert/strict";
import test from "node:test";
import {desktopAppLayout} from "../src/components/desktopLayout";
test("Mac layout reserves navigation space and bounds sections without changing other hosts",()=>{
  for(const width of[320,640,900,960,1280,1792,2560]){
    const mac=desktopAppLayout(width,true);
    assert.equal(mac.desktop,true);assert.equal(mac.topPadding,64);assert.equal(mac.maxWidth,1120);
    assert.equal(mac.columns,width>=960?2:1);
    assert.equal(desktopAppLayout(width,false).columns,1);
    assert.equal(desktopAppLayout(width,false).maxWidth,1080);
    assert.equal(desktopAppLayout(width,true,1.5).columns,1);
  }
  for(const width of[NaN,0,-5,Infinity])assert.equal(desktopAppLayout(width,true).desktop,false);
});
