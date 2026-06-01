# AI Stock Advisor Feature

## Overview
The AI Stock Advisor is a data-driven business intelligence feature that answers natural language questions about inventory using real stock and audit data.

## API Endpoint

```
GET /ai/stock/advice?question={your_question}
```

**Security**: Requires ADMIN role (automatically secured via `/ai/**` pattern)

**Example Request**:
```bash
GET http://localhost:8080/ai/stock/advice?question=What%20should%20I%20reorder?
```

## Supported Questions

### 1. Reorder Suggestions
**Keywords**: `reorder`, `restock`, `low`, `need`, `should i buy`

**Example Questions**:
- "What should I reorder?"
- "What items need restocking?"
- "Show me low stock items"
- "What should I buy?"

**Example Response**:
```
📋 REORDER SUGGESTIONS (Top 5 Priority Items):

1. 5MM (Stand #3)
   Current: 2 units | Minimum: 10 units | Gap: 8 units
   💡 Recommended reorder: 20 units

2. 8MM (Stand #5)
   Current: 5 units | Minimum: 15 units | Gap: 10 units
   💡 Recommended reorder: 30 units

Total items needing reorder: 7
```

### 2. Best Selling Glass
**Keywords**: `sell`, `selling`, `best`, `popular`, `most sold`

**Example Questions**:
- "Which glass sells most?"
- "What is the best selling glass?"
- "Show me popular items"
- "Which glass is selling well?"

**Example Response**:
```
🏆 BEST SELLING GLASS (Last 30 Days):

1. 5MM - 240 units sold
2. 8MM - 180 units sold
3. 10MM - 95 units sold

📈 Total units sold in last 30 days: 515
```

### 3. Dead Stock
**Keywords**: `dead`, `slow`, `stagnant`, `not moving`, `stuck`

**Example Questions**:
- "Which glass is dead stock?"
- "Show me slow moving items"
- "What stock is not moving?"
- "Which items are stuck?"

**Example Response**:
```
⚠️ DEAD STOCK (No sales in last 60 days):

1. 12MM
   Total quantity: 45 units across 2 stand(s)
   Stands: #8, #12

2. 6MM
   Total quantity: 30 units across 1 stand(s)
   Stands: #15

💡 Consider running promotions or reviewing pricing for these items.
```

### 4. Frequently Moved Stands
**Keywords**: `stand`, `frequent`, `active`, `movement`, `busy`

**Example Questions**:
- "Which stand has frequent movement?"
- "Show me active stands"
- "Which stands are busy?"
- "What stands have the most activity?"

**Example Response**:
```
📊 MOST ACTIVE STANDS (By total operations):

1. Stand #3 - 145 operations
2. Stand #5 - 98 operations
3. Stand #7 - 76 operations

📈 Stand #3 breakdown:
   ADD: 45
   REMOVE: 78
   TRANSFER: 22
```

## Implementation Details

### Service: `AiStockAdvisorService`
- **Location**: `com.glassshop.ai.service.AiStockAdvisorService`
- **Method**: `getAdvice(String question)`
- **Multi-tenant**: Automatically filters by current user's shop

### Core Logic

#### A) Reorder Suggestions
- Queries: `stockRepository.findLowStockByShopId(shopId)`
- Filters: `quantity < minQuantity`
- Ranking: By gap (minQuantity - quantity) descending
- Returns: Top 5 items with recommended reorder quantity (minQuantity * 2)

#### B) Best Selling Glass
- Queries: `auditLogRepository.findByShopAndTimestampBetween()` (last 30 days)
- Filters: `action = 'REMOVE'`
- Aggregation: Groups by `glassType`, sums `quantity`
- Ranking: By total quantity sold descending

#### C) Dead Stock
- Queries: All stock items + REMOVE actions (last 60 days)
- Filters: 
  - `quantity > 0` (still in stock)
  - No REMOVE action in last 60 days
- Groups by glass type for cleaner output

#### D) Frequently Moved Stands
- Queries: All audit logs for shop
- Aggregation: Groups by `standNo`, counts all actions
- Ranking: By total operations descending
- Bonus: Action breakdown for top stand

### Keyword Detection
Currently uses simple keyword matching. 
**TODO**: Replace with LLM intent classification for better natural language understanding.

## Future Enhancements

### TODO Items (marked in code):
1. **LLM Integration**: Replace keyword detection with OpenAI API / LLM for better NLU
2. **Caching**: Cache frequently requested insights for performance
3. **Advanced Analytics**: 
   - Trend analysis (sales over time)
   - Seasonality detection
   - Predictive reordering
   - Profit margin analysis
4. **More Insights**:
   - Fastest moving items
   - Stand utilization rates
   - Customer preferences
   - Optimal reorder quantities based on sales velocity

## Testing

### Manual Testing
```bash
# Reorder question
curl -H "Authorization: Bearer {token}" \
  "http://localhost:8080/ai/stock/advice?question=What%20should%20I%20reorder?"

# Best selling
curl -H "Authorization: Bearer {token}" \
  "http://localhost:8080/ai/stock/advice?question=Which%20glass%20sells%20most?"

# Dead stock
curl -H "Authorization: Bearer {token}" \
  "http://localhost:8080/ai/stock/advice?question=Which%20glass%20is%20dead%20stock?"

# Stand activity
curl -H "Authorization: Bearer {token}" \
  "http://localhost:8080/ai/stock/advice?question=Which%20stand%20has%20frequent%20movement?"
```

## Code Quality
- ✅ Clean, modular code
- ✅ Production-ready
- ✅ Multi-tenant support
- ✅ Data-driven (no hardcoded responses)
- ✅ Human-readable output
- ✅ Comprehensive error handling
- ✅ Well-documented with TODO comments for future enhancements

