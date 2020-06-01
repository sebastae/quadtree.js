class QuadTree{
    constructor(width, height, regionCapacity=4, pointOutsideRegionPolicy=QuadTree.RETURNFALSE|QuadTree.LOGERROR){
        this.width = width;
        this.height = height;
        this.capacity = regionCapacity;
        this.region = QuadTree.Region(QuadTree.AABB(0, 0, width, height), this.capacity);
        this.policy = pointOutsideRegionPolicy;
        this.onerror = () => {};
    }

    push(x,y,data){
        if(this.region.contains(x,y)){
            const point = QuadTree.Point(x, y, data);
            this.region.push(point);
        } else {
            this._handlePointOutsideRegion(point);
        }
    }

    /** 
     * Inserts all points from an array
     * @param {array} points - An array of points where each point is an object with properties x, y and optionaly data to be included
     */
    pushAll(points){
        for (const point of points){
            this.push(point.x, point.y, point.data);
        }
    }

    expandTo(x,y){
        this.expandBy(Math.max(x - this.width, 0), Math.max(y - this.height));
    }

    expandBy(width, height){
        this.width += width;
        this.height += height;
        this._recalculate();
    }

    queryRadius(x,y, radius){
        const rectPoints = this.queryRect(x,y, radius, radius, true);
        return rectPoints.filter(point => (Math.pow(x - point.x, 2) + Math.pow(y - point.y), 2) <= radius*radius);
    }

    queryRect(x,y, width, height, centered = false){
        if(centered){
            return queryAbsoluteRegion(x - width/2, y - height/2 , x + width/2, y + height/2);
        } else {
            return queryAbsoluteRegion(x, y, x + width, y + height);
        }
    }

    queryAbsoluteRegion(x1, y1, x2, y2){
        return this.region.query(QuadTree.AABB(x1, y1, x2, y2));
    }

    getAllPoints(){
        return this.region.getAllPoints();
    }

    getPoints(){
        return this.region.getPoints();
    }

    objectify(){
        return this.region.objectify;
    }

    toString(){
        return JSON.stringify(this.objectify());
    }

    _handlePointOutsideRegion(point){
        if(this.policy & QuadTree.LOGERROR){console.error("Point is outside quadtree region: " + point.toString());}
        if(this.policy & QuadTree.EXPANDONERROR){
            this.expandTo(point.x, point.y);
            this.push(point);
        }
        if(this.policy & QuadTree.CALLONERROR){typeof this.onerror === "function" && this.onerror();}
        if(this.policy & QuadTree.THROWEXCEPTION){throw "Point is outside quadtree region: " + point.toString();}
    }
    
    _recalculate(){
        const points = this.getAllPoints();
        this.region = Region(AABB(0,0, this.width, this.height), this.capacity);
        this.pushAll(points);
    }

}

QuadTree.Point = class {
    constructor(x,y,data){
        this.x = x;
        this.y = y;
        this.data = data;
    }

    objectify(){
        return {
            x: this.x,
            y: this.y,
            data: this.data
        };
    }

    toString(){
        return `(${this.x},${this.y}): ${String(this.data)}`;
    }
};

QuadTree.Region = class {
    constructor(boundingRect, capacity=4){
        this.points = [];
        this.topLeft = null;
        this.topRight = null;
        this.bottomLeft = null;
        this.bottomRight = null;
        this.boundingRect = boundingRect;
        this.capacity = capacity;
    }

    push(point){
        if(this.points.length < capacity){
            this.points.push(point);
            return true;
        } else {
            if(topLeft === null){
                this._subdivide();
            }
            
            if(this.topLeft.containsPoint(point)){
                this.topLeft.push(point);
                return true;
            } else if(this.topRight.containsPoint(point)){
                this.topRight.push(point);
                return true;
            } else if(this.bottomLeft.containsPoint(point)){
                this.bottomLeft.push(point);
                return true;
            } else if(this.bottomRight.containsPoint(point)){
                this.bottomRight.push(point);
                return true;
            }

            // Should not be able to happen
            return false;
        }

    }

    getPoints(){
        return this.points;
    }

    getAllPoints(){
        const points = this.points;
        if(this.topLeft !== null){points.concat(this.topLeft.getAllPoints());}
        if(this.topRight !== null){points.concat(this.topRight.getAllPoints());}
        if(this.bottomLeft !== null){points.concat(this.bottomLeft.getAllPoints());}
        if(this.bottomRight !== null){points.concat(this.bottomRight.getAllPoints());}
        return points;
    }

    contains(x,y){
        return this.boundingRect.contains(x,y);
    }

    containsPoint(point){
        return this.contains(point.x, point.y);
    }

    objectify(){
        return {
            boundingRect: this.boundingRect,
            points: this.points,
            topLeft: this.topLeft.objectify(),
            topRight: this.topRight.objectify(),
            bottomLeft: this.bottomLeft.objectify(),
            bottomRight: this.bottomRight.objectify()
        };
    }

    intersects(rect){
        return this.boundingRect.intersects(rect);
    }

    query(aabb){
        const points = this.points.filter(p => aabb.contains(p.x, p.y));
        if(this.topLeft.intersects(aabb)){points.concat(this.topLeft.query(aabb));}
        if(this.topRight.intersects(aabb)){points.concat(this.topRight.query(aabb));}
        if(this.bottomLeft.intersects(aabb)){points.concat(this.bottomLeft.query(aabb));}
        if(this.bottomRight.intersects(aabb)){points.concat(this.bottomRight.query(aabb));}
        return points;
    }

    _subdivide(){
        const start= this.boundingRect.start, 
              end = this.boundingRect.end, 
              middle = {x: end.x - start.x, y: end.y - start.y};
        this.topLeft = Region(QuadTree.AABB(start.x, start.y, middle.x, middle.y), this.capacity);
        this.topRight = Region(QuadTree.AABB(middle.x, start.y, end.x, middle.y), this.capacity);
        this.bottomLeft = Region(QuadTree.AABB(start.x, middle.y, middle.x, end.y), this.capacity);
        this.bottomRight = Region(QuadTree.AABB(middle.x, middle.y, end.x, end.y), this.capacity);
    }

};

QuadTree.AABB = class {
    constructor(x1, y1, x2, y2){
        this.start = {x: Math.min(x1,x2), y: Math.min(y1, y2)};
        this.end = {x: Math.max(x1, x2), y: Math.max(y1, y2)};
    }

    get left(){
        return this.start.x;
    }

    get right(){
        return this.end.x;
    }

    get top(){
        return this.start.y;
    }

    get bottom(){
        return this.end.y;
    }
    contains(x,y){
        return x >= this.start.x && 
               x <= this.end.y && 
               y >= this.start.y && 
               y >= this.end.y;
    }

    intersects(aabb){
        return aabb.left <= this.right && aabb.right >= this.left && aabb.top >= this.bottom && aabb.bottom <= this.top;
    }
};

// Error Policies
QuadTree.RETURNFALSE    = 0b000001;
QuadTree.DONOTHING      = 0b000010;
QuadTree.CALLONERROR    = 0b000100;
QuadTree.LOGERROR       = 0b001000;
QuadTree.THROWEXCEPTION = 0b010000;
QuatTree.EXPANDONERROR  = 0b100000;

export default QuadTree;